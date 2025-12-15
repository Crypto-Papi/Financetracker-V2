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
    const { public_token, userId, metadata } = req.body

    if (!public_token || !userId) {
      return res.status(400).json({ error: 'public_token and userId are required' })
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    })

    const accessToken = exchangeResponse.data.access_token
    const itemId = exchangeResponse.data.item_id

    // Get account details
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    })

    const accounts = accountsResponse.data.accounts
    const institution = metadata?.institution

    // Store in Firestore
    const appId = process.env.VITE_APP_ID || 'finance-tracker-app'
    const plaidItemRef = db.collection(`artifacts/${appId}/users/${userId}/plaidItems`).doc(itemId)

    await plaidItemRef.set({
      accessToken, // In production, encrypt this!
      itemId,
      institutionId: institution?.institution_id || null,
      institutionName: institution?.name || 'Unknown Bank',
      accounts: accounts.map(acc => ({
        id: acc.account_id,
        name: acc.name,
        officialName: acc.official_name,
        type: acc.type,
        subtype: acc.subtype,
        mask: acc.mask,
        currentBalance: acc.balances.current,
        availableBalance: acc.balances.available,
      })),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(200).json({ 
      success: true,
      itemId,
      accounts: accounts.map(acc => ({
        id: acc.account_id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        mask: acc.mask,
      }))
    })
  } catch (error) {
    console.error('Error exchanging token:', error)
    res.status(500).json({ 
      error: 'Failed to exchange token',
      details: error.response?.data || error.message 
    })
  }
}

