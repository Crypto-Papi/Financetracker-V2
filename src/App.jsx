import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, doc, getDoc, getFirestore, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Auth } from './components/Auth'
import Dashboard from './components/Dashboard'
import { VerifyEmail } from './components/VerifyEmail'

// Initialize Firebase
let app, auth, db

// Try to get Firebase config from environment variables (Vercel) or window object (other deployments)
const firebaseConfig = window.__firebase_config || {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBWffURf2K0vWxDv3kr8x2v1FtnnhSAjwM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "financeapp-13f67.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "financeapp-13f67",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "financeapp-13f67.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "83328545198",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:83328545198:web:7634bc775c25574852983f"
}

if (firebaseConfig && firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)

  // Disable QUIC protocol to avoid timeout issues and use long polling
	  db.settings = {
	    experimentalForceLongPolling: true,
	    cacheSizeBytes: 40 * 1024 * 1024 // 40MB cache
	  }
	} else {
	  // Firebase config not found; running in development mode without Firebase.
	}

function App() {
  const [transactions, setTransactions] = useState([])
  const [userId, setUserId] = useState(null)
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [firebaseStatus, setFirebaseStatus] = useState('connecting') // 'connecting', 'connected', 'error'
  const [firebaseError, setFirebaseError] = useState(null)
  const [monthResetNotification, setMonthResetNotification] = useState(null)

  // Firebase authentication
  useEffect(() => {
    if (!auth) {
      setUserId('dev-user-123')
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user)
        setUserId(user.uid)
        setLoading(false)
      } else {
        setUser(null)
        setUserId(null)
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // Load user profile from Firebase
  useEffect(() => {
    if (!db || !userId) return

    const loadUserProfile = async () => {
      try {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile/info`)
        const profileSnap = await getDoc(userProfileRef)

        if (profileSnap.exists()) {
          setUserProfile(profileSnap.data())
        } else if (user?.displayName) {
          // Fallback to Firebase Auth displayName if profile doesn't exist
          setUserProfile({ name: user.displayName, email: user.email })
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
        // Fallback to displayName from auth
        if (user?.displayName) {
          setUserProfile({ name: user.displayName, email: user.email })
        }
      }
    }

    loadUserProfile()
  }, [db, userId, user])

  // Load transactions from localStorage on mount (for dev mode)
  useEffect(() => {
    if (!db) {
      const savedData = localStorage.getItem('finance-tracker-transactions')
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          setTransactions(parsed)
        } catch (error) {
          console.error('Error loading from localStorage:', error)
        }
      }
      setLoading(false)
    }
  }, [])

  // Load transactions from Firestore
  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
        const saved = localStorage.getItem('finance-tracker-transactions')
        if (saved) {
          const parsed = JSON.parse(saved)
          setTransactions(parsed)
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error)
      }
      setLoading(false)
    }

    if (!userId) return
    if (!db) {
      loadFromLocalStorage()
      return
    }

    const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
    const transactionsRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`)
    const q = query(transactionsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedTransactions = snapshot.docs.map(doc => {
        const data = doc.data()
        let createdAt = Date.now()

        // Handle Timestamp objects, numbers, and date strings (YYYY-MM-DD)
        if (data.createdAt) {
          if (typeof data.createdAt === 'string') {
            // Date string (YYYY-MM-DD) - keep as is
            createdAt = data.createdAt
          } else if (typeof data.createdAt.toMillis === 'function') {
            // Firestore Timestamp object
            createdAt = data.createdAt.toMillis()
          } else if (typeof data.createdAt === 'number') {
            // Already a number (milliseconds)
            createdAt = data.createdAt
          }
        }

        return {
          id: doc.id,
          ...data,
          createdAt
        }
      })
      setTransactions(loadedTransactions)
      setFirebaseStatus('connected')
      setFirebaseError(null)
      setLoading(false)
    }, (error) => {
      console.error('Error loading transactions from Firestore:', error)
      setFirebaseStatus('error')
      setFirebaseError(error.message)
      loadFromLocalStorage()
      setLoading(false)
    })

    return () => unsubscribe()
  }, [userId])

  // Auto-save to localStorage (always save, even if Firebase is available)
  useEffect(() => {
    if (transactions.length > 0 && !loading) {
      localStorage.setItem('finance-tracker-transactions', JSON.stringify(transactions))
    }
  }, [transactions, loading])

  // Auto-reset non-recurring transactions on the first of each month
  useEffect(() => {
    if (!userId || loading || transactions.length === 0) return

    const checkAndResetMonth = async () => {
      const today = new Date()
      const currentDay = today.getDate()
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()

      // Check if we've already reset this month
      const lastResetKey = `last-month-reset-${currentYear}-${currentMonth}`
      const lastResetDate = localStorage.getItem(lastResetKey)

      // Only reset on the 1st of the month and if we haven't already reset today
      if (currentDay === 1 && lastResetDate !== `${currentYear}-${currentMonth}-1`) {
        const nonRecurringTransactions = transactions.filter(t => !t.isRecurring)

        if (nonRecurringTransactions.length > 0) {
          try {
            if (db) {
              const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'

              // Delete non-recurring transactions from Firebase
	                for (const transaction of nonRecurringTransactions) {
	                  const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, transaction.id)
	                  await deleteDoc(transactionRef)
	                }
            } else {
              // Local state update - keep only recurring transactions
	                setTransactions(transactions.filter(t => t.isRecurring))
            }

            // Mark that we've reset this month
            localStorage.setItem(lastResetKey, `${currentYear}-${currentMonth}-1`)

            // Show notification
            setMonthResetNotification({
              message: `✅ Monthly reset complete! Deleted ${nonRecurringTransactions.length} non-recurring transaction(s). All recurring transactions kept.`,
              timestamp: Date.now()
            })

            // Auto-dismiss notification after 8 seconds
            setTimeout(() => {
              setMonthResetNotification(null)
            }, 8000)
          } catch (error) {
            console.error('Error during auto-reset:', error)
            setMonthResetNotification({
              message: `⚠️ Error during monthly reset: ${error.message}`,
              timestamp: Date.now(),
              isError: true
            })
            setTimeout(() => {
              setMonthResetNotification(null)
            }, 8000)
          }
        }
      }
    }

    checkAndResetMonth()
  }, [userId, loading, transactions, db])


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading your finances...</p>
        </div>
      </div>
    )
  }

  // Allow development mode without authentication
  const isDevelopment = !auth || !db
  if (!user && !isDevelopment) {
    return <Auth auth={auth} onAuthSuccess={() => {}} />
  }

  // Check if user needs to verify email (only for real Firebase users, not dev mode)
  if (user && !isDevelopment && !user.emailVerified) {
    return (
      <VerifyEmail
        user={user}
        auth={auth}
        onBackToLogin={() => {
          setUser(null)
          setUserId(null)
        }}
      />
    )
  }

  // Use mock user for development mode
  const displayUser = user || { email: 'dev@example.com', uid: 'dev-user-123' }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setTransactions([])
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <Dashboard
      transactions={transactions}
      setTransactions={setTransactions}
      userId={userId || 'dev-user-123'}
      user={displayUser}
      userProfile={userProfile}
      setUserProfile={setUserProfile}
      db={db}
      auth={auth}
      handleLogout={handleLogout}
      firebaseStatus={firebaseStatus}
      firebaseError={firebaseError}
      monthResetNotification={monthResetNotification}
      setMonthResetNotification={setMonthResetNotification}
    />
  )
}

export default App
