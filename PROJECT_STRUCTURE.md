# Finance Tracker - Project Structure

## Overview
A modern React + Firebase finance tracking application with real-time data synchronization.

## Project Structure

```
financetracker-app/
├── src/
│   ├── components/
│   │   ├── Login.jsx          # Authentication component
│   │   ├── Login.css          # Login styling
│   │   ├── Dashboard.jsx      # Main dashboard with transactions
│   │   └── Dashboard.css      # Dashboard styling
│   ├── firebase.js            # Firebase configuration & initialization
│   ├── App.jsx                # Main app component with auth state
│   ├── App.css                # App styling
│   ├── main.jsx               # React entry point
│   └── index.css              # Global styles
├── public/
│   └── vite.svg
├── package.json               # Dependencies
├── vite.config.js             # Vite configuration
├── FIREBASE_SETUP.md          # Firebase setup instructions
└── PROJECT_STRUCTURE.md       # This file
```

## Key Components

### 1. **Login Component** (`src/components/Login.jsx`)
- Email/Password authentication
- Sign up and login functionality
- Error handling
- Toggle between login and signup modes

### 2. **Dashboard Component** (`src/components/Dashboard.jsx`)
- Display income, expenses, and balance summary
- Add new transactions
- View transaction history
- Delete transactions
- Real-time updates from Firestore

### 3. **Firebase Configuration** (`src/firebase.js`)
- Initializes Firebase app
- Exports auth and db instances
- Ready for your credentials

### 4. **App Component** (`src/App.jsx`)
- Manages authentication state
- Routes between Login and Dashboard
- Handles user session persistence

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool
- **Firebase** - Backend services
  - Authentication (Email/Password)
  - Firestore (Real-time database)
- **CSS3** - Styling

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Firebase:**
   - Follow `FIREBASE_SETUP.md`
   - Update `src/firebase.js` with your credentials

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## Database Schema

### Transactions Collection
```javascript
{
  userId: string,           // User ID from Firebase Auth
  amount: number,           // Transaction amount
  description: string,      // Transaction description
  category: string,         // "income" or "expense"
  timestamp: Timestamp      // When transaction was created
}
```

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Create React app with Vite
3. ✅ Implement authentication
4. ✅ Create dashboard with transactions
5. 📋 Add categories management
6. 📋 Add budget tracking
7. 📋 Add charts and analytics
8. 📋 Add recurring transactions
9. 📋 Deploy to Firebase Hosting

## Notes

- All data is private and only accessible to authenticated users
- Firestore security rules ensure users can only access their own data
- Real-time updates using Firestore listeners
- Responsive design works on mobile and desktop

