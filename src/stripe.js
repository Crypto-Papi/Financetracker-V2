import { loadStripe } from '@stripe/stripe-js'
import { collection, doc, addDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore'

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51Se0Or2ZbUSBaSJSDvSFB5Up1hwyVH78uG4LWu02eiWJnJzQXEkqZgy5kapFI4E6VCCkOd7gLMdrR58kgqV9JkM4q00g4TpsG3b'
const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || 'price_1Se0pF2ZbUSBaSJSpVgC0Pbe'

// Initialize Stripe
let stripePromise = null

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

/**
 * Create a Stripe Checkout session and redirect to payment
 * This works with the Firebase "Run Subscription Payments with Stripe" extension
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} userId - Current user's ID
 * @param {string} appId - Application ID for Firestore path
 * @returns {Promise<void>}
 */
export async function createCheckoutSession(db, userId, appId) {
  if (!db || !userId) {
    throw new Error('Database and user ID are required')
  }

  // Create a checkout session in Firestore
  // The Firebase extension listens to this collection and creates the Stripe session
  // Path must match the extension's "Customer details and subscriptions collection" setting
  const checkoutSessionsRef = collection(db, `customers/${userId}/checkout_sessions`)
  
  // Use production URL for redirects (can be overridden via env var)
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://keelfinances.com'

  const sessionDoc = await addDoc(checkoutSessionsRef, {
    price: STRIPE_PRICE_ID,
    success_url: `${baseUrl}?payment=success`,
    cancel_url: `${baseUrl}?payment=cancelled`,
    mode: 'subscription',
    trial_period_days: 7,
    created: new Date()
  })

  // Wait for the extension to add the checkout URL
  return new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(sessionDoc, async (snap) => {
      const data = snap.data()

      if (data?.error) {
        unsubscribe()
        reject(new Error(data.error.message))
        return
      }

      // The extension provides a 'url' field for redirect (redirectToCheckout is deprecated)
      if (data?.url) {
        unsubscribe()
        // Redirect to Stripe Checkout URL
        window.location.assign(data.url)
        resolve()
      }
    }, (error) => {
      unsubscribe()
      reject(error)
    })

    // Timeout after 30 seconds
    setTimeout(() => {
      unsubscribe()
      reject(new Error('Checkout session creation timed out. Please try again.'))
    }, 30000)
  })
}

/**
 * Check if user has an active subscription
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} userId - Current user's ID
 * @param {string} appId - Application ID for Firestore path
 * @returns {Promise<{isSubscribed: boolean, subscription: Object|null}>}
 */
export async function checkSubscriptionStatus(db, userId, appId) {
  if (!db || !userId) {
    return { isSubscribed: false, subscription: null }
  }

  try {
    // Check the subscriptions subcollection
    // Path must match the extension's "Customer details and subscriptions collection" setting
    const subscriptionsRef = collection(db, `customers/${userId}/subscriptions`)
    const q = query(subscriptionsRef, where('status', 'in', ['active', 'trialing']))
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      const subscriptionData = snapshot.docs[0].data()
      return { 
        isSubscribed: true, 
        subscription: {
          id: snapshot.docs[0].id,
          ...subscriptionData
        }
      }
    }

    return { isSubscribed: false, subscription: null }
  } catch (error) {
    console.error('Error checking subscription status:', error)
    return { isSubscribed: false, subscription: null }
  }
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions
 *
 * @param {Object} db - Firestore database instance
 * @param {string} userId - Current user's ID
 * @returns {Promise<void>}
 */
export async function createPortalSession(db, userId) {
  if (!db || !userId) {
    throw new Error('Database and user ID are required')
  }

  const baseUrl = import.meta.env.VITE_APP_URL || 'https://keelfinances.com'

  // The Firebase Stripe extension uses a callable function for portal sessions
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const functions = getFunctions(undefined, 'us-central1')
  const createPortalLink = httpsCallable(functions, 'ext-firestore-stripe-payments-createPortalLink')

  try {
    const { data } = await createPortalLink({ returnUrl: baseUrl })
    window.location.assign(data.url)
  } catch (error) {
    console.error('Error creating portal session:', error)
    throw new Error('Failed to open subscription management. Please try again.')
  }
}

/**
 * Check if user is a "lifetime free" user (friends & family)
 *
 * @param {Object} userProfile - User's profile data from Firestore
 * @returns {boolean}
 */
export function isLifetimeFreeUser(userProfile) {
  return userProfile?.is_lifetime_free === true
}

export { STRIPE_PRICE_ID }

