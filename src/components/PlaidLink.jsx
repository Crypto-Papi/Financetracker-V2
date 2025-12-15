import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'

const API_BASE = import.meta.env.VITE_API_URL || ''

export function PlaidLinkButton({ userId, onSuccess, onExit, className, children }) {
  const [linkToken, setLinkToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch link token from backend
  const fetchLinkToken = useCallback(async () => {
    if (!userId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/api/create-link-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create link token')
      }
      
      const data = await response.json()
      setLinkToken(data.link_token)
    } catch (err) {
      console.error('Error fetching link token:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchLinkToken()
  }, [fetchLinkToken])

  const handleOnSuccess = useCallback(async (public_token, metadata) => {
    try {
      // Exchange public token for access token
      const response = await fetch(`${API_BASE}/api/exchange-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          public_token, 
          userId,
          metadata 
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to exchange token')
      }
      
      const data = await response.json()
      
      // Sync transactions after connecting
      await fetch(`${API_BASE}/api/sync-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          itemId: data.itemId
        }),
      })
      
      if (onSuccess) {
        onSuccess(data)
      }
    } catch (err) {
      console.error('Error in Plaid success handler:', err)
      setError(err.message)
    }
  }, [userId, onSuccess])

  const handleOnExit = useCallback((err, metadata) => {
    if (err) {
      console.error('Plaid Link exit with error:', err)
    }
    if (onExit) {
      onExit(err, metadata)
    }
  }, [onExit])

  const config = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: handleOnExit,
  }

  const { open, ready } = usePlaidLink(config)

  const handleClick = () => {
    if (ready) {
      open()
    }
  }

  if (error) {
    return (
      <button
        onClick={fetchLinkToken}
        className={className || "px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"}
      >
        Error - Click to Retry
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={!ready || loading}
      className={className || "px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"}
    >
      {loading ? 'Loading...' : children || 'Connect Account'}
    </button>
  )
}

export default PlaidLinkButton

