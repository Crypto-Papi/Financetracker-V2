import { useState, useEffect } from 'react'
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore'
import { isLifetimeFreeUser } from '../stripe'

/**
 * Custom hook to check user's subscription status
 * 
 * Returns:
 * - hasAccess: true if user can access premium content (subscribed OR lifetime free)
 * - isLoading: true while checking subscription status
 * - isLifetimeFree: true if user has is_lifetime_free flag
 * - isSubscribed: true if user has active Stripe subscription
 * - subscription: subscription details if subscribed
 * - error: error message if any
 */
export function useSubscription(db, userId, userProfile, appId) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [error, setError] = useState(null)

  // Check if user is lifetime free
  const isLifetimeFree = isLifetimeFreeUser(userProfile)

  useEffect(() => {
    // If user is lifetime free, no need to check subscription
    if (isLifetimeFree) {
      setIsLoading(false)
      return
    }

    // If no db or userId, can't check subscription
    if (!db || !userId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // Listen to user's subscriptions collection
    const subscriptionsRef = collection(db, `artifacts/${appId}/users/${userId}/subscriptions`)
    const q = query(subscriptionsRef, where('status', 'in', ['active', 'trialing']))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const subscriptionData = snapshot.docs[0].data()
        setIsSubscribed(true)
        setSubscription({
          id: snapshot.docs[0].id,
          ...subscriptionData
        })
      } else {
        setIsSubscribed(false)
        setSubscription(null)
      }
      setIsLoading(false)
    }, (err) => {
      console.error('Error checking subscription:', err)
      setError(err.message)
      setIsSubscribed(false)
      setSubscription(null)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [db, userId, isLifetimeFree, appId])

  // User has access if they're lifetime free OR have active subscription
  const hasAccess = isLifetimeFree || isSubscribed

  return {
    hasAccess,
    isLoading,
    isLifetimeFree,
    isSubscribed,
    subscription,
    error
  }
}

export default useSubscription

