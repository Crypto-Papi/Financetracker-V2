import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
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

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
})

const plaidClient = new PlaidApi(configuration)

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, itemId } = req.body

    if (!userId || !itemId) {
      return res.status(400).json({ error: 'userId and itemId are required' })
    }

    const appId = process.env.VITE_APP_ID || 'finance-tracker-app'
    const plaidItemRef = db.collection(`artifacts/${appId}/users/${userId}/plaidItems`).doc(itemId)
    
    const plaidItemDoc = await plaidItemRef.get()
    
    if (!plaidItemDoc.exists) {
      return res.status(404).json({ error: 'Plaid item not found' })
    }

    const { accessToken } = plaidItemDoc.data()

    // Remove the item from Plaid (invalidates access token)
    try {
      await plaidClient.itemRemove({
        access_token: accessToken,
      })
    } catch (plaidError) {
      // If the item is already invalid at Plaid, continue with local cleanup
      console.log('Plaid item removal warning:', plaidError.message)
    }

    // Delete the Plaid item from Firestore
    await plaidItemRef.delete()

    // Optionally: Delete all transactions from this Plaid item
    const transactionsRef = db.collection(`artifacts/${appId}/users/${userId}/transactions`)
    const transactionsSnapshot = await transactionsRef.where('plaidItemId', '==', itemId).get()
    
    const batch = db.batch()
    transactionsSnapshot.forEach(doc => {
      batch.delete(doc.ref)
    })
    await batch.commit()

    res.status(200).json({ 
      success: true,
      message: 'Account disconnected successfully',
      deletedTransactions: transactionsSnapshot.size
    })
  } catch (error) {
    console.error('Error disconnecting Plaid account:', error)
    res.status(500).json({ 
      error: 'Failed to disconnect account',
      details: error.message 
    })
  }
}

