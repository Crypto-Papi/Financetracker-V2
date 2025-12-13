import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'
import { useState } from 'react'

export function Auth({ auth, onAuthSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)

  // Handle resending verification email for existing unverified accounts
  const handleResendVerification = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password to resend verification')
      return
    }

    setResendingEmail(true)
    setError('')
    setSuccess('')

    try {
      // Sign in to get the user object
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      if (user.emailVerified) {
        // Already verified, just proceed
        setSuccess('Your email is already verified! Logging you in...')
        setTimeout(() => onAuthSuccess(), 1000)
      } else {
        // Send verification email
        await sendEmailVerification(user)
        setSuccess('Verification email sent! Please check your inbox and spam folder.')
        setShowResendVerification(false)
      }
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes before trying again.')
      } else {
        setError('Failed to send verification email. Please try again.')
      }
    } finally {
      setResendingEmail(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('🚀 handleSubmit called, isSignUp:', isSignUp)
    alert('Form submitted! isSignUp: ' + isSignUp)

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isSignUp) {
        // Validate name
        if (!name.trim()) {
          setError('Please enter your name')
          setLoading(false)
          return
        }

        console.log('📝 Creating user account for:', email)
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user
        console.log('✅ User created:', user.uid)

        // Update user profile with display name
        console.log('📝 Updating profile...')
        await updateProfile(user, { displayName: name.trim() })
        console.log('✅ Profile updated')

        // Save user profile to Firebase
        const db = getFirestore()
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        console.log('📝 Saving to Firestore profile...')
        const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile/info`)
        await setDoc(userProfileRef, {
          name: name.trim(),
          email: email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        console.log('✅ Firestore profile saved')

        // Also save to flat mailing_list collection for easy export/email marketing
        // This is non-blocking - we don't want it to break signup if it fails
        console.log('📝 Saving to mailing_list...')
        try {
          const mailingListRef = doc(db, `artifacts/${appId}/mailing_list/${user.uid}`)
          await setDoc(mailingListRef, {
            name: name.trim(),
            email: email,
            userId: user.uid,
            signupDate: serverTimestamp(),
            source: 'signup',
            marketingOptIn: true
          })
          console.log('✅ Mailing list saved')
        } catch (mailingError) {
          console.warn('⚠️ Mailing list save failed (non-critical):', mailingError.message)
          // Continue anyway - this shouldn't block signup
        }

        // Send email verification
        console.log('🔄 About to send verification email to:', user.email)
        try {
          await sendEmailVerification(user)
          console.log('✅ Verification email sent successfully to:', user.email)
          alert('✅ Verification email sent to ' + user.email + '! Check your inbox and spam folder.')
        } catch (emailError) {
          console.error('❌ Failed to send verification email:', emailError)
          console.error('Error code:', emailError.code)
          console.error('Error message:', emailError.message)
          alert('❌ Failed to send email: ' + (emailError.code || emailError.message))
        }

        // Don't sign out - let App.jsx handle showing the VerifyEmail page
      } else {
        // Sign in existing user
        await signInWithEmailAndPassword(auth, email, password)
        // App.jsx will check emailVerified and show VerifyEmail page if needed
      }
      setEmail('')
      setPassword('')
      setName('')
      onAuthSuccess()
    } catch (err) {
      // Friendly error messages
      let errorMessage = err.message
      setShowResendVerification(false)

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.'
        // Show resend verification option in case they never verified
        setShowResendVerification(true)
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.'
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = 'Invalid email or password.'
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.'
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!email.trim()) {
        setError('Please enter your email address')
        setLoading(false)
        return
      }

      await sendPasswordResetEmail(auth, email)
      setSuccess('Password reset email sent! Check your inbox.')
    } catch (err) {
      let errorMessage = err.message
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.'
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Forgot Password Form
  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700/50">
            <img src="/keel-logo.png" alt="Keel" className="w-24 h-24 mx-auto mb-6" />
            <p className="text-center text-gray-400 mb-8">Enter your email to receive a reset link</p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {error && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">{error}</div>}
              {success && <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 text-sm">{success}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsForgotPassword(false)
                  setError('')
                  setSuccess('')
                }}
                className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700/50">
          <img src="/keel-logo.png" alt="Keel" className="w-32 h-32 mx-auto mb-6" />
          <p className="text-center text-gray-400 mb-8">Manage your money, track your goals</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
                {showResendVerification && (
                  <div className="mt-2 pt-2 border-t border-red-500/30">
                    <p className="text-xs text-red-200 mb-2">
                      Haven't verified your email yet? Enter your password and resend the verification email.
                    </p>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendingEmail}
                      className="text-xs bg-red-500/30 hover:bg-red-500/50 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {resendingEmail ? 'Sending...' : '📧 Resend Verification Email'}
                    </button>
                  </div>
                )}
              </div>
            )}
            {success && <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 text-sm">{success}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          {!isSignUp && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsForgotPassword(true)
                  setError('')
                  setSuccess('')
                }}
                className="text-gray-400 hover:text-gray-300 text-sm cursor-pointer"
              >
                Forgot your password?
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                  setSuccess('')
                }}
                className="ml-2 text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-300">
              💡 <strong>Tip:</strong> Create an account to save your data securely in the cloud. A verification email will be sent to confirm your address.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

