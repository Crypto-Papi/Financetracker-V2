# Fix Firestore Permissions Error

## Problem
You're getting: `FirebaseError: Missing or insufficient permissions`

## Root Cause
Your app stores transactions at: `/artifacts/{appId}/users/{userId}/transactions`

But your Firestore security rules don't allow this path.

## Solution: Update Firestore Security Rules

1. **Go to Firebase Console**
   - Open https://console.firebase.google.com/
   - Select your project: `financeapp-13f67`

2. **Navigate to Firestore Rules**
   - Click **Firestore Database** (left sidebar)
   - Click **Rules** tab

3. **Replace ALL rules with this:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own transactions
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. **Click "Publish"** button

5. **Wait 30 seconds** for rules to deploy

6. **Refresh your app** - the error should be gone!

## What These Rules Do
- ✅ Allow authenticated users to read their own data
- ✅ Allow authenticated users to write their own data
- ❌ Prevent unauthenticated access
- ❌ Prevent users from accessing other users' data

## Still Getting Errors?
1. Make sure you're logged in (check email in top-left)
2. Check browser console for the exact error
3. Verify the rules were published (look for green checkmark)

