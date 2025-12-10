# Firebase Setup Guide

## Step 1: Get Your Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project "financetracker"
3. Click on **Project Settings** (gear icon)
4. Go to the **General** tab
5. Scroll down to find your Firebase SDK snippet
6. Copy your Firebase config object

Your config should look like:
```javascript
{
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

## Step 2: Update Firebase Configuration

1. Open `src/firebase.js`
2. Replace the `firebaseConfig` object with your actual credentials
3. Save the file

## Step 3: Update Firestore Security Rules

1. Go to Firebase Console > Firestore Database
2. Click on **Rules** tab
3. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /transactions/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
  }
}
```

4. Click **Publish**

## Step 4: Run the App

```bash
npm run dev
```

The app will start on `http://localhost:5173`

## Step 5: Test the App

1. Sign up with an email and password
2. Add some transactions
3. View your balance and transaction history

## Features

- ✅ User Authentication (Email/Password)
- ✅ Add Income and Expense transactions
- ✅ View transaction history
- ✅ Calculate balance
- ✅ Delete transactions
- ✅ Real-time updates from Firestore

## Troubleshooting

### "Firebase config is not defined"
- Make sure you updated `src/firebase.js` with your credentials

### "Permission denied" errors
- Check your Firestore security rules
- Make sure you're logged in

### Transactions not showing up
- Check browser console for errors
- Verify Firestore database has the "transactions" collection

