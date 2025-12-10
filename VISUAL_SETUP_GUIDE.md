# Visual Setup Guide - Finance Tracker

## 🎯 3 Simple Steps to Get Running

### STEP 1️⃣: Get Firebase Credentials (2 min)

```
Firebase Console
    ↓
Project Settings (⚙️ icon)
    ↓
Scroll to "Your apps"
    ↓
Copy Firebase Config
    ↓
Paste into src/firebase.js
```

**Your config looks like:**
```javascript
{
  apiKey: "AIzaSyD...",
  authDomain: "financetracker-abc.firebaseapp.com",
  projectId: "financetracker-abc",
  storageBucket: "financetracker-abc.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

### STEP 2️⃣: Update Security Rules (1 min)

```
Firebase Console
    ↓
Firestore Database
    ↓
Rules Tab
    ↓
Copy rules from FIREBASE_SETUP.md
    ↓
Paste and Publish
```

### STEP 3️⃣: Run the App (1 min)

```bash
cd financetracker-app
npm run dev
```

Then open: **http://localhost:5173**

---

## 🧪 Test It Works

1. **Sign Up**
   - Click "Sign Up"
   - Enter email: test@example.com
   - Enter password: Test123!
   - Click "Sign Up"

2. **Add Transaction**
   - Amount: 100
   - Description: Salary
   - Category: Income
   - Click "Add Transaction"

3. **Check Balance**
   - Should show Income: $100
   - Should show Balance: $100

4. **Add Expense**
   - Amount: 25
   - Description: Groceries
   - Category: Expense
   - Click "Add Transaction"

5. **Verify**
   - Income: $100
   - Expenses: $25
   - Balance: $75 ✅

---

## 📊 What Happens Behind the Scenes

```
You Sign Up
    ↓
Firebase Auth creates user
    ↓
You Add Transaction
    ↓
React sends to Firestore
    ↓
Firestore saves with your userId
    ↓
Real-time listener updates UI
    ↓
You see transaction instantly
```

---

## 🎨 App Flow

```
App Starts
    ↓
Check if logged in?
    ├─ YES → Show Dashboard
    │         ├─ View transactions
    │         ├─ Add transaction
    │         └─ Delete transaction
    │
    └─ NO → Show Login
            ├─ Sign Up
            └─ Login
```

---

## 📱 What You Can Do

| Feature | How |
|---------|-----|
| Add Income | Amount + Description + Select "Income" |
| Add Expense | Amount + Description + Select "Expense" |
| View Balance | See summary cards at top |
| Delete Transaction | Click "Delete" button |
| Logout | Click "Logout" button |
| Login Again | Email + Password |

---

## ✅ Success Checklist

- [ ] Firebase config updated
- [ ] Security rules published
- [ ] App running on localhost:5173
- [ ] Can sign up
- [ ] Can add transactions
- [ ] Balance calculates correctly
- [ ] Can logout and login
- [ ] Transactions persist

---

## 🆘 If Something Goes Wrong

| Error | Fix |
|-------|-----|
| "Firebase config is not defined" | Update src/firebase.js |
| "Permission denied" | Publish Firestore rules |
| "App won't start" | Run npm install |
| "Transactions not showing" | Check browser console (F12) |

---

## 🎊 You're Done!

Your Finance Tracker is ready to use!

**Total time: ~15 minutes**

**Questions? Check the documentation files!** 📚

