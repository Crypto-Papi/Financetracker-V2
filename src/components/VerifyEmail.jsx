import { sendEmailVerification } from 'firebase/auth'
import { useState } from 'react'

export function VerifyEmail({ user, auth, onBackToLogin }) {
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState('')

  const handleResendEmail = async () => {
    setResendLoading(true)
    setResendError('')
    setResendSuccess(false)

    try {
      await sendEmailVerification(user)
      setResendSuccess(true)
    } catch (error) {
      if (error.code === 'auth/too-many-requests') {
        setResendError('Too many requests. Please wait a few minutes before trying again.')
      } else {
        setResendError('Failed to send verification email. Please try again.')
      }
    } finally {
      setResendLoading(false)
    }
  }

  const handleBackToLogin = async () => {
    try {
      await auth.signOut()
      onBackToLogin()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700/50 text-center">
          {/* Logo */}
          <img src="/keel-logo.png" alt="Keel" className="w-16 h-16 mx-auto mb-4" />

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2">Verify Your Email</h1>
          <p className="text-gray-400 mb-6">
            We've sent a verification link to:
          </p>

          {/* Email Display */}
          <div className="bg-gray-900/50 rounded-lg px-4 py-3 mb-6">
            <p className="text-blue-400 font-medium">{user?.email}</p>
          </div>

          {/* Instructions */}
          <div className="text-left bg-gray-900/30 rounded-lg p-4 mb-6">
            <p className="text-gray-300 text-sm mb-3">Please follow these steps:</p>
            <ol className="text-gray-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">1.</span>
                Check your inbox (and spam folder)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">2.</span>
                Click the verification link in the email
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">3.</span>
                Return here and sign in
              </li>
            </ol>
          </div>

          {/* Success/Error Messages */}
          {resendSuccess && (
            <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 text-sm mb-4">
              ✅ Verification email sent! Check your inbox.
            </div>
          )}
          {resendError && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm mb-4">
              {resendError}
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={resendLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {resendLoading ? 'Sending...' : '📧 Resend Verification Email'}
            </button>

            <button
              onClick={handleBackToLogin}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors cursor-pointer"
            >
              ← Back to Login
            </button>
          </div>

          {/* Help Text */}
          <p className="text-gray-500 text-xs mt-6">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  )
}

