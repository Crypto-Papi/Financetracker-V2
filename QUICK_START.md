# Quick Start Guide - Finance Tracker

## ✅ What's Already Done

Your React + Firebase Finance Tracker app is ready! Here's what we've set up:

### Frontend (React + Vite)
- ✅ React project created with Vite
- ✅ Login component with email/password auth
- ✅ Dashboard with transaction management
- ✅ Beautiful UI with gradient styling
- ✅ Real-time transaction updates

### Backend (Firebase)
- ✅ Firebase project created
- ✅ Authentication enabled (Email/Password)
- ✅ Firestore database created
- ✅ Transactions collection ready

## 🚀 Next Steps (5 minutes)

### Step 1: Get Firebase Credentials
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your "financetracker" project
3. Click ⚙️ **Project Settings**
4. Scroll to **Your apps** section
5. Copy the Firebase config object

### Step 2: Update Firebase Config
1. Open `financetracker-app/src/firebase.js`
2. Replace the placeholder values with your credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```
3. Save the file

### Step 3: Update Firestore Security Rules
1. Go to Firebase Console > Firestore Database
2. Click **Rules** tab
3. Replace with:
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

### Step 4: Run the App
```bash
cd financetracker-app
npm run dev
```

Open http://localhost:5173 in your browser!

### Step 5: Test It
1. Click "Sign Up"
2. Create an account with email/password
3. Add some transactions
4. See your balance update in real-time!

## 📁 Project Files

- `src/firebase.js` - Firebase configuration
- `src/components/Login.jsx` - Authentication UI
- `src/components/Dashboard.jsx` - Main app UI
- `src/App.jsx` - App routing logic
- `FIREBASE_SETUP.md` - Detailed Firebase setup
- `PROJECT_STRUCTURE.md` - Full project overview

## 🎯 Features

✅ User authentication (email/password)
✅ Add income and expense transactions
✅ View transaction history
✅ Calculate balance automatically
✅ Delete transactions
✅ Real-time data sync with Firestore
✅ Responsive design
✅ Secure (only see your own data)

## 🆘 Troubleshooting

**"Firebase config is not defined"**
→ Update `src/firebase.js` with your credentials

**"Permission denied" errors**
→ Check Firestore security rules are published

**App won't start**
→ Run `npm install` in the financetracker-app folder

## 📚 Learn More

- [Firebase Docs](https://firebase.google.com/docs)
- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)

---

**You're all set! 🎉 Start tracking your finances!**

