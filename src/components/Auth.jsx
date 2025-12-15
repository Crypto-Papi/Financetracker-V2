import { createUserWithEmailAndPassword, GoogleAuthProvider, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth'
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'
import { useState } from 'react'

const googleProvider = new GoogleAuthProvider()

export function Auth({ auth, onAuthSuccess, onBackToLanding, initialIsSignUp = false }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp)
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

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      // Check if user profile exists, if not create one
      const db = getFirestore()
      const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
      const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile/info`)
      const profileSnap = await getDoc(userProfileRef)

      if (!profileSnap.exists()) {
        // New user - create profile
        await setDoc(userProfileRef, {
          name: user.displayName || 'User',
          email: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })

        // Also save to mailing list
        try {
          const mailingListRef = doc(db, `artifacts/${appId}/mailing_list/${user.uid}`)
          await setDoc(mailingListRef, {
            name: user.displayName || 'User',
            email: user.email,
            userId: user.uid,
            signupDate: serverTimestamp(),
            source: 'google_signup',
            marketingOptIn: true
          })
        } catch (mailingError) {
          console.warn('Mailing list save failed (non-critical):', mailingError.message)
        }
      }

      onAuthSuccess()
    } catch (err) {
      console.error('Google sign-in error:', err)
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.')
      } else if (err.code === 'auth/popup-blocked') {
        setError('Pop-up blocked. Please allow pop-ups and try again.')
      } else {
        setError('Failed to sign in with Google. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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

        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Update user profile with display name
        await updateProfile(user, { displayName: name.trim() })

        // Save user profile to Firebase
        const db = getFirestore()
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile/info`)
        await setDoc(userProfileRef, {
          name: name.trim(),
          email: email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })

        // Also save to flat mailing_list collection for easy export/email marketing
        // This is non-blocking - we don't want it to break signup if it fails
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
        } catch (mailingError) {
          console.warn('Mailing list save failed (non-critical):', mailingError.message)
        }

        // Send email verification
        try {
          await sendEmailVerification(user)
          setSuccess('Account created! Verification email sent to ' + user.email)
        } catch (emailError) {
          if (emailError.code === 'auth/too-many-requests') {
            setError('Too many email requests. Please wait a few minutes.')
          } else {
            setSuccess('Account created! You can resend verification from the next screen.')
          }
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

          {isSignUp ? (
            <>
              <h2 className="text-center text-xl font-bold text-white mb-2">Start Your Free Trial</h2>
              <p className="text-center text-gray-400 mb-2">7 days free, then $4.99/month</p>
              <p className="text-center text-gray-500 text-sm mb-6">Cancel anytime. No commitment.</p>
            </>
          ) : (
            <p className="text-center text-gray-400 mb-8">Welcome back! Sign in to continue.</p>
          )}

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
              className={`w-full py-3 font-semibold rounded-lg transition-colors cursor-pointer ${
                isSignUp
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:bg-gray-600`}
            >
              {loading ? 'Loading...' : isSignUp ? 'Start Free Trial →' : 'Sign In'}
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800/50 text-gray-400">or</span>
              </div>
            </div>

            {/* Google Sign-in Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-gray-100 disabled:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
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
                {isSignUp ? 'Sign In' : 'Start Free Trial'}
              </button>
            </p>
          </div>

          {isSignUp && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited transaction tracking</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Budgeting & insights</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Debt payoff planner</span>
              </div>
            </div>
          )}

          {/* Back to Home Link */}
          {onBackToLanding && (
            <div className="mt-6 text-center">
              <button
                onClick={onBackToLanding}
                className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
              >
                ← Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

