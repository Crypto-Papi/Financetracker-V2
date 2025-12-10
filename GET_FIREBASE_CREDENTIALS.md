# How to Get Your Firebase Credentials

## Step-by-Step Instructions

### 1. Open Firebase Console
- Go to https://console.firebase.google.com/
- Sign in with your Google account
- Click on your "financetracker" project

### 2. Navigate to Project Settings
- Look for the **⚙️ Settings icon** (gear) in the top-left sidebar
- Click it and select **Project Settings**

### 3. Find Your Firebase Config
- You should be on the **General** tab
- Scroll down to the **Your apps** section
- You'll see your app listed (it might say "financetracker-app")
- Click on the app name or the **</>** icon to see the config

### 4. Copy the Config Object
You'll see something like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "financetracker-abc123.firebaseapp.com",
  projectId: "financetracker-abc123",
  storageBucket: "financetracker-abc123.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### 5. Update Your App
1. Open `financetracker-app/src/firebase.js`
2. Replace the entire `firebaseConfig` object with your copied config
3. Save the file

### 6. Verify It Works
- Run `npm run dev` in the financetracker-app folder
- You should see the app load without errors
- Try signing up with a test email

## What Each Field Means

| Field | Purpose |
|-------|---------|
| `apiKey` | Public API key for your Firebase project |
| `authDomain` | Domain for authentication |
| `projectId` | Your Firebase project ID |
| `storageBucket` | Cloud Storage bucket (optional for now) |
| `messagingSenderId` | For push notifications (optional) |
| `appId` | Unique app identifier |

## Security Note

⚠️ **Important**: Your `apiKey` is public and safe to share. It's not a secret key.
- The real security comes from Firestore rules
- Users can only access their own data
- Never expose your Firebase Admin SDK key

## Still Having Issues?

1. Make sure you're in the right Firebase project
2. Check that the config has all 6 fields
3. Verify there are no typos
4. Try refreshing the Firebase Console page
5. Check the browser console for error messages

---

**Once you've updated the config, your app is ready to use!** 🚀

