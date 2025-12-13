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

        // Send email verification
        await sendEmailVerification(user)

        // Don't sign out - let App.jsx handle showing the VerifyEmail page
        // This provides a smoother UX than signing out and making them log in again
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
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.'
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
            <h1 className="text-4xl font-bold text-center mb-2 text-white">🔐 Reset Password</h1>
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
          <h1 className="text-4xl font-bold text-center mb-2 text-white">💰 Finance Tracker</h1>
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

            {error && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">{error}</div>}
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

