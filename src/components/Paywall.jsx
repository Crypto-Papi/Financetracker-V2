import { useState } from 'react'
import { createCheckoutSession } from '../stripe'

/**
 * Paywall component shown to users without an active subscription
 */
export function Paywall({ db, userId, userEmail, onLogout }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'

  const handleSubscribe = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await createCheckoutSession(db, userId, appId)
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err.message || 'Failed to start checkout. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-gray-800">
        {/* Logo */}
        <div className="text-center mb-6">
          <img 
            src="/keel-logo.png" 
            alt="Keel" 
            className="h-16 mx-auto mb-4"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <h1 className="text-3xl font-bold text-purple-600">Keel Pro</h1>
          <p className="text-gray-500 mt-2">Take control of your finances</p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Unlimited transaction tracking</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Budgeting tools & insights</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Debt payoff planner</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Cash flow analysis</span>
          </div>
        </div>

        {/* Price */}
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-purple-600">$4.99</div>
          <div className="text-gray-500">per month</div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Subscribe button */}
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            'Subscribe Now'
          )}
        </button>

        {/* User info and logout */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-2">
            Signed in as {userEmail}
          </p>
          <button
            onClick={onLogout}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            Sign out
          </button>
        </div>

        {/* Terms */}
        <p className="mt-6 text-xs text-gray-400 text-center">
          By subscribing, you agree to our Terms of Service. 
          Cancel anytime from your account settings.
        </p>
      </div>
    </div>
  )
}

export default Paywall

