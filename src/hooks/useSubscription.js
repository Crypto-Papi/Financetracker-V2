import { useState, useEffect } from 'react'
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore'
import { isLifetimeFreeUser } from '../stripe'

// Cache key for subscription status
const SUBSCRIPTION_CACHE_KEY = 'keel-subscription-cache'

/**
 * Get cached subscription status to prevent paywall flash on return from Stripe
 */
function getCachedSubscription(userId) {
  try {
    const cached = localStorage.getItem(SUBSCRIPTION_CACHE_KEY)
    if (cached) {
      const data = JSON.parse(cached)
      // Only use cache if it's for the same user and less than 5 minutes old
      if (data.userId === userId && Date.now() - data.timestamp < 5 * 60 * 1000) {
        return data.isSubscribed
      }
    }
  } catch (e) {
    // Ignore cache errors
  }
  return null
}

/**
 * Cache subscription status
 */
function setCachedSubscription(userId, isSubscribed) {
  try {
    localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify({
      userId,
      isSubscribed,
      timestamp: Date.now()
    }))
  } catch (e) {
    // Ignore cache errors
  }
}

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
  // Initialize with cached value to prevent flash
  const cachedStatus = getCachedSubscription(userId)
  const [isLoading, setIsLoading] = useState(cachedStatus === null)
  const [isSubscribed, setIsSubscribed] = useState(cachedStatus || false)
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
    // Path must match Firebase Stripe extension's "Customer details and subscriptions collection" setting
    const subscriptionsRef = collection(db, `customers/${userId}/subscriptions`)

    // Check for active, trialing, OR past_due (give grace period)
    // Also need to check canceled subscriptions that haven't reached period end yet
    const q = query(subscriptionsRef, where('status', 'in', ['active', 'trialing', 'past_due']))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const subscriptionData = snapshot.docs[0].data()
        setIsSubscribed(true)
        setCachedSubscription(userId, true)
        setSubscription({
          id: snapshot.docs[0].id,
          ...subscriptionData
        })
        setIsLoading(false)
      } else {
        // No active subscription found, but check if there's a canceled one
        // that still has access until period end
        const canceledQuery = query(subscriptionsRef)
        onSnapshot(canceledQuery, (allSubs) => {
          let hasAccess = false
          let accessibleSub = null

          allSubs.docs.forEach(doc => {
            const data = doc.data()
            // Check if subscription was canceled but period hasn't ended yet
            if (data.cancel_at_period_end && data.current_period_end) {
              const periodEnd = data.current_period_end.toDate ?
                data.current_period_end.toDate() :
                new Date(data.current_period_end.seconds * 1000)

              if (periodEnd > new Date()) {
                hasAccess = true
                accessibleSub = { id: doc.id, ...data }
              }
            }
          })

          setIsSubscribed(hasAccess)
          setCachedSubscription(userId, hasAccess)
          setSubscription(accessibleSub)
          setIsLoading(false)
        }, () => {
          setIsSubscribed(false)
          setCachedSubscription(userId, false)
          setSubscription(null)
          setIsLoading(false)
        })
      }
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

