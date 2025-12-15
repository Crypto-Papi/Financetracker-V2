import admin from 'firebase-admin'

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = admin.firestore()

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date, X-Api-Version, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const appId = process.env.VITE_APP_ID || 'finance-tracker-app'
    
    // Get all connected Plaid items for this user
    const plaidItemsRef = db.collection(`artifacts/${appId}/users/${userId}/plaidItems`)
    const snapshot = await plaidItemsRef.get()

    const connectedAccounts = []
    
    snapshot.forEach(doc => {
      const data = doc.data()
      connectedAccounts.push({
        itemId: doc.id,
        institutionName: data.institutionName,
        accounts: data.accounts || [],
        lastSyncedAt: data.lastSyncedAt,
        createdAt: data.createdAt,
      })
    })

    res.status(200).json({ 
      success: true,
      accounts: connectedAccounts
    })
  } catch (error) {
    console.error('Error getting accounts:', error)
    res.status(500).json({ 
      error: 'Failed to get accounts',
      details: error.message 
    })
  }
}

