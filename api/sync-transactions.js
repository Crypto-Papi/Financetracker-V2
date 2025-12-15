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
    const { userId, itemId } = req.body

    if (!userId || !itemId) {
      return res.status(400).json({ error: 'userId and itemId are required' })
    }

    const appId = process.env.VITE_APP_ID || 'finance-tracker-app'
    
    // Get the stored access token
    const plaidItemRef = db.doc(`artifacts/${appId}/users/${userId}/plaidItems/${itemId}`)
    const plaidItemDoc = await plaidItemRef.get()

    if (!plaidItemDoc.exists) {
      return res.status(404).json({ error: 'Plaid item not found' })
    }

    const { accessToken } = plaidItemDoc.data()

    // Get transactions for the last 30 days
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    })

    const transactions = transactionsResponse.data.transactions
    const transactionsRef = db.collection(`artifacts/${appId}/users/${userId}/transactions`)

    let addedCount = 0
    let skippedCount = 0

    // Add transactions to Firestore
    for (const txn of transactions) {
      // Check if transaction already exists (by plaidTransactionId)
      const existingQuery = await transactionsRef
        .where('plaidTransactionId', '==', txn.transaction_id)
        .limit(1)
        .get()

      if (!existingQuery.empty) {
        skippedCount++
        continue
      }

      // Determine transaction type based on amount
      // Plaid: positive = money out (expense), negative = money in (income/refund)
      const isExpense = txn.amount > 0
      const amount = Math.abs(txn.amount)

      await transactionsRef.add({
        description: txn.name || txn.merchant_name || 'Unknown Transaction',
        amount,
        type: isExpense ? 'expense' : 'income',
        category: txn.personal_finance_category?.primary || txn.category?.[0] || 'Uncategorized',
        spendingType: isExpense ? 'flexible' : null,
        isRecurring: false,
        plaidTransactionId: txn.transaction_id,
        plaidAccountId: txn.account_id,
        plaidItemId: itemId,
        merchantName: txn.merchant_name,
        createdAt: txn.date, // Use transaction date
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'plaid',
      })
      addedCount++
    }

    // Update last sync time
    await plaidItemRef.update({
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(200).json({ 
      success: true,
      added: addedCount,
      skipped: skippedCount,
      total: transactions.length
    })
  } catch (error) {
    console.error('Error syncing transactions:', error)
    res.status(500).json({ 
      error: 'Failed to sync transactions',
      details: error.response?.data || error.message 
    })
  }
}

