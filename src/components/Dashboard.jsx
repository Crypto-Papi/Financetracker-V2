import { ResponsivePie } from '@nivo/pie'
import { ResponsiveSankey } from '@nivo/sankey'
import { updateProfile } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DebtPaidOffModal from './DebtPaidOffModal.jsx'
import { useOnboarding } from './Onboarding.jsx'
import { createPortalSession } from '../stripe'

// Fast bill checkbox component with LOCAL state for instant UI response
const BillCheckboxItem = React.memo(({ bill, initialPaid, onToggle, showDate, currentMonthLabel, dueDay }) => {
  const [isPaid, setIsPaid] = useState(initialPaid)

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    setIsPaid(prev => !prev) // Instant local update
    onToggle(bill.id) // Background update
  }, [bill.id, onToggle])

  // Sync with external state if it changes
  useEffect(() => {
    setIsPaid(initialPaid)
  }, [initialPaid])

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center justify-between px-5 py-4 rounded-xl transition-colors cursor-pointer ${
        isPaid
          ? 'bg-emerald-50 border border-emerald-100'
          : 'bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          isPaid
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-slate-300 group-hover:border-indigo-400'
        }`}>
          {isPaid && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        {showDate && (
          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-sm ${
            isPaid
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
          }`}>
            <span className="text-[10px] uppercase font-semibold opacity-80">{currentMonthLabel}</span>
            <span className="text-lg leading-none">{dueDay}</span>
          </div>
        )}
        <div>
          <p className={`font-semibold ${isPaid ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>{bill.description}</p>
          <p className={`text-sm ${isPaid ? 'text-emerald-600' : 'text-slate-500'}`}>{bill.category || 'Uncategorized'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={`font-bold text-lg ${isPaid ? 'text-emerald-600' : 'text-slate-800'}`}>
            ${bill.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
          {isPaid && <p className="text-xs text-emerald-500 font-medium">Paid ✓</p>}
        </div>
      </div>
    </div>
  )
})

// Helper to consistently handle transaction dates
// Always treat YYYY-MM-DD strings as local dates to avoid timezone/UTC shifting
export const getCreatedAtTimestamp = (createdAt) => {
  if (!createdAt) return 0
  if (typeof createdAt === 'string') {
    const [year, month, day] = createdAt.split('-').map(Number)
    if (!year || !month || !day) return 0
    return new Date(year, month - 1, day).getTime()
  }
  if (typeof createdAt === 'number') {
    return new Date(createdAt).getTime()
  }
  if (createdAt && typeof createdAt.toDate === 'function') {
    return createdAt.toDate().getTime()
  }
  return new Date(createdAt).getTime()
}

const getCreatedAtDate = (createdAt) => {
  const ts = getCreatedAtTimestamp(createdAt)
  if (!ts) return null
  return new Date(ts)
}

function Dashboard({
  transactions,
  setTransactions,
  userId,
  user,
  userProfile,
  setUserProfile,
  db,
  auth,
  handleLogout,
  firebaseStatus,
  firebaseError,
  monthResetNotification,
  setMonthResetNotification,
  isSubscribed,
  isLifetimeFree
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('income')
  const [category, setCategory] = useState('')
  const [spendingType, setSpendingType] = useState('flexible') // 'fixed' or 'flexible'
  const [budget, setBudget] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [transactionDate, setTransactionDate] = useState('') // For all transactions
  const [remainingBalance, setRemainingBalance] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [editingId, setEditingId] = useState(null)

  // Debt-related categories that should show interest rate
  const debtCategories = [
    'Credit Card',
    'Auto Loan',
    'Student Loan',
    'Personal Loan',
    'Loan Payment',
    'Mortgage',
    'Rent/Mortgage',
    'Home Loan'
  ]

  const shouldShowInterestRate = debtCategories.includes(category)
  const [isEditing, setIsEditing] = useState(false)
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [debtModalValue, setDebtModalValue] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [notification, setNotification] = useState(null)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [cashflowYear, setCashflowYear] = useState(new Date().getFullYear())

  // Onboarding tour hook - pass userId so each user gets their own onboarding
  const { startTour } = useOnboarding(setActiveSection, userId)
  const [cashflowViewMode, setCashflowViewMode] = useState('category') // 'category' or 'type' (fixed vs flexible)
  const [budgetTab, setBudgetTab] = useState('budget') // 'budget' or 'forecast'
  const [liabilitiesTimeframe, setLiabilitiesTimeframe] = useState('1month') // '1month', '3months', '6months', '1year'
  const [reportsTab, setReportsTab] = useState('cashflow') // 'cashflow', 'spending', 'income'
  const [rightPanelTab, setRightPanelTab] = useState('summary')

  const [showAllCategories, setShowAllCategories] = useState(false)
  const [savingsGoals, setSavingsGoals] = useState([])
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalTargetAmount, setGoalTargetAmount] = useState('')
  const [goalCurrent, setGoalCurrent] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false)
  const [addMoneyGoalId, setAddMoneyGoalId] = useState(null)
  const [addMoneyAmount, setAddMoneyAmount] = useState('')
  const [showEditAmountModal, setShowEditAmountModal] = useState(false)
  const [editAmountGoalId, setEditAmountGoalId] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [expandedSpendingTypes, setExpandedSpendingTypes] = useState({ income: true, expenses: true, fixed: true, flexible: true }) // { income, expenses, fixed, flexible }
  const [showDebtPayoffComparison, setShowDebtPayoffComparison] = useState(false)
  const [selectedPayoffMethod, setSelectedPayoffMethod] = useState(null) // 'snowball' or 'avalanche' (for modal selection)
  const [chosenPayoffMethod, setChosenPayoffMethod] = useState(null) // 'snowball' or 'avalanche' (persisted choice)
  const [payoffComparison, setPayoffComparison] = useState(null)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [deleteConfirmData, setDeleteConfirmData] = useState(null) // { type, id, description, onConfirm }
  const [debtPayoffAllocation, setDebtPayoffAllocation] = useState('') // Monthly amount to allocate to debt payoff
  const [paidOffDebts, setPaidOffDebts] = useState({}) // { debtId: true/false }
  const [showDebtPaidOffModal, setShowDebtPaidOffModal] = useState(false)
  const [celebratingDebtName, setCelebratingDebtName] = useState('')
  const [monthlySnapshots, setMonthlySnapshots] = useState([]) // Historical monthly liability snapshots
  const [appStartDate, setAppStartDate] = useState(null) // When user started using the app

  // My Account modal state
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [accountSaving, setAccountSaving] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  // Handle opening Stripe Customer Portal
  const handleManageSubscription = useCallback(async () => {
    setPortalLoading(true)
    try {
      await createPortalSession(db, userId)
    } catch (error) {
      console.error('Error opening subscription portal:', error)
      alert(error.message || 'Failed to open subscription management')
      setPortalLoading(false)
    }
  }, [db, userId])

  // Complete Profile prompt (for users without a name)
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false)
  const [profileNameInput, setProfileNameInput] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [showUnbudgetedFixed, setShowUnbudgetedFixed] = useState(false)
  const [showUnbudgetedFlexible, setShowUnbudgetedFlexible] = useState(false)
  const [showUnbudgetedIncome, setShowUnbudgetedIncome] = useState(false)
  const [fixedBudgetInput, setFixedBudgetInput] = useState('')
  const [flexibleBudgetInput, setFlexibleBudgetInput] = useState('')
  const [flexibleBudgetEdits, setFlexibleBudgetEdits] = useState({}) // { [category]: number|string }
  const [fixedBudgetEdits, setFixedBudgetEdits] = useState({}) // { [category]: number|string }
  const [incomeBudgetEdits, setIncomeBudgetEdits] = useState({}) // { [category]: number|string }

  // Show red overspend bars only when overspend is at or above this threshold (in dollars)
  const OVERSPEND_BAR_THRESHOLD = 1;

  const getCategoryEmoji = (category) => {
    const map = {
      // Spending — Fixed
      'Rent': '🏠',
      'Mortgage': '🏠',
      'HOA': '🏘️',
      'Property Tax': '🧾',
      'Bills & Utilities': '💡',
      'Utilities': '💡',
      'Electricity': '💡',
      'Water': '🚰',
      'Sewer': '🚽',
      'Natural Gas': '🔥',
      'Gas Bill': '🔥',
      'Internet': '🌐',
      'Cable': '📺',
      'Internet & Cable': '📡',
      'Phone': '📱',
      'Mobile Phone': '📱',
      'Cell Phone': '📱',
      'Subscriptions': '🔁',
      'Streaming': '📺',
      'Insurance': '🛡️',
      'Auto Insurance': '🛡️',
      'Home Insurance': '🛡️',
      'Health Insurance': '🏥',
      'Life Insurance': '🛡️',
      'Car Payment': '🚗',
      'Auto Loan': '🚗',
      'Loan Payment': '💳',
      'Student Loan': '🎓',
      'Debt Payment': '💳',
      'Childcare': '👶',
      'Daycare': '👶',
      'Tuition': '🎓',
      'Gym': '🏋️',
      'Medical': '🏥',
      'Doctor': '🩺',
      'Dentist': '🦷',
      'Prescriptions': '💊',
      'Home': '🏠',
      'Home Improvement': '🛠️',
      'Maintenance': '🛠️',
      'Car Maintenance': '🛠️',
      'Parking': '🅿️',
      'Public Transit': '🚇',
      'Ride Share': '🚕',
      'Uber': '🚕',
      'Lyft': '🚕',
      'Fuel': '⛽',
      'Gasoline': '⛽',
      'Garbage': '🗑️',

      // Spending — Flexible
      'Restaurants & Bars': '🍽️',
      'Dining Out': '🍽️',
      'Fast Food': '🍔',
      'Coffee': '☕',
      'Alcohol': '🍺',
      'Bars': '🍻',
      'Groceries': '🍎',
      'Shopping': '🛍️',
      'Clothing': '👕',
      'Electronics': '💻',
      'Entertainment & Recreation': '🎭',
      'Recreation': '🏃',
      'Travel': '✈️',
      'Flights': '✈️',
      'Hotels': '🏨',
      'Vacation': '🏝️',
      'Health & Fitness': '💪',
      'Personal Care': '🧴',
      'Beauty': '💅',
      'Hair': '💇',
      'Gifts & Donations': '🎁',
      'Donations': '🙏',
      'Pets': '🐾',
      'Investments': '📈',
      'Business': '💼',
      'Taxes': '🧾',
      'Gas': '⛽',
      'Miscellaneous': '🧰',
      'Other': '➕',
      'Uncategorized': '❓',

      // Income
      'Paychecks': '💼',
      'Salary': '💼',
      'Bonus': '🎉',
      'Other Income': '💸',
      'Interest': '🏦',
      'Investment Income': '📈',
      'Business Income': '🏢',
      'Rental Income': '🏠',
      'Dividends': '💹',
      'Refund': '💵',
      'Reimbursement': '💵'
    }
    return map[category] || '🔹'
  }


  // Monthly per-category budgets (Firestore)
  const [budgetsFlexible, setBudgetsFlexible] = useState({}) // { [category]: number }
  const [budgetsFixed, setBudgetsFixed] = useState({}) // { [category]: number }
  const [budgetsIncome, setBudgetsIncome] = useState({}) // { [category]: number }
  const [budgetsMonthKey, setBudgetsMonthKey] = useState('')

  useEffect(() => {
    if (!db || !userId) return
    const now = new Date()
    const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setBudgetsMonthKey(mk)
    ;(async () => {
      try {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const catsRef = collection(db, `artifacts/${appId}/users/${userId}/budgets/${mk}/categories`)
        const snap = await getDocs(catsRef)
        const fixed = {}
        const flexible = {}
        const income = {}
        snap.forEach(d => {
          const data = d.data() || {}
          const category = data.category || decodeURIComponent(d.id)
          const amount = typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0
          const spendingType = data.spendingType || 'flexible'
          if (spendingType === 'fixed') fixed[category] = amount
          else if (spendingType === 'income') income[category] = amount
          else flexible[category] = amount
        })
        setBudgetsFixed(fixed)
        setBudgetsFlexible(flexible)
        setBudgetsIncome(income)
      } catch (e) {
        console.error('Error loading budgets:', e)
      }
    })()
  }, [db, userId])

  // Load user preferences (including chosen payoff method)
  useEffect(() => {
    if (!db || !userId) return
    ;(async () => {
      try {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const prefsRef = doc(db, `artifacts/${appId}/users/${userId}/preferences/settings`)
        const prefsSnap = await getDoc(prefsRef)
        if (prefsSnap.exists()) {
          const data = prefsSnap.data()
          if (data.chosenPayoffMethod) {
            setChosenPayoffMethod(data.chosenPayoffMethod)
          }
          if (data.debtPayoffAllocation) {
            setDebtPayoffAllocation(data.debtPayoffAllocation)
          }
        }
      } catch (e) {
        console.error('Error loading user preferences:', e)
      }
    })()
  }, [db, userId])

  // Load monthly liability snapshots from Firebase
  useEffect(() => {
    if (!db || !userId) return
    ;(async () => {
      try {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const snapshotsRef = collection(db, `artifacts/${appId}/users/${userId}/liabilitySnapshots`)
        const snap = await getDocs(snapshotsRef)
        const snapshots = []
        let earliestDate = null
        snap.forEach(d => {
          const data = d.data()
          snapshots.push({
            monthKey: d.id, // Format: YYYY-MM
            totalLiabilities: data.totalLiabilities || 0,
            createdAt: data.createdAt
          })
          // Track earliest snapshot to determine app start date
          if (!earliestDate || d.id < earliestDate) {
            earliestDate = d.id
          }
        })
        setMonthlySnapshots(snapshots)
        if (earliestDate) {
          const [year, month] = earliestDate.split('-')
          setAppStartDate(new Date(parseInt(year), parseInt(month) - 1, 1))
        } else {
          // No snapshots yet, set app start date to current month
          setAppStartDate(new Date())
        }
      } catch (e) {
        console.error('Error loading liability snapshots:', e)
      }
    })()
  }, [db, userId])

  // Save chosen payoff method to Firebase when it changes
  const saveChosenPayoffMethod = async (method) => {
    setChosenPayoffMethod(method)
    if (!db || !userId) return
    try {
      const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
      const prefsRef = doc(db, `artifacts/${appId}/users/${userId}/preferences/settings`)
      await setDoc(prefsRef, { chosenPayoffMethod: method, updatedAt: serverTimestamp() }, { merge: true })
    } catch (e) {
      console.error('Error saving payoff method:', e)
    }
  }

  // Save debt payoff allocation to Firebase when it changes
  const saveDebtPayoffAllocation = async (amount) => {
    setDebtPayoffAllocation(amount)
    if (!db || !userId) return
    try {
      const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
      const prefsRef = doc(db, `artifacts/${appId}/users/${userId}/preferences/settings`)
      await setDoc(prefsRef, { debtPayoffAllocation: amount, updatedAt: serverTimestamp() }, { merge: true })
    } catch (e) {
      console.error('Error saving debt payoff allocation:', e)
    }
  }

  // Load savings goals from Firebase
  useEffect(() => {
    if (!db || !userId) return
    ;(async () => {
      try {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const goalsRef = collection(db, `artifacts/${appId}/users/${userId}/savingsGoals`)
        const goalsSnap = await getDocs(goalsRef)
        const goals = []
        goalsSnap.forEach(d => {
          goals.push({ id: d.id, ...d.data() })
        })
        setSavingsGoals(goals)
      } catch (e) {
        console.error('Error loading savings goals:', e)
      }
    })()
  }, [db, userId])

  // Save savings goal to Firebase
  const saveSavingsGoal = async (goal) => {
    if (!db || !userId) return goal
    try {
      const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
      const goalsRef = collection(db, `artifacts/${appId}/users/${userId}/savingsGoals`)
      const docRef = await addDoc(goalsRef, { ...goal, updatedAt: serverTimestamp() })
      return { ...goal, id: docRef.id }
    } catch (e) {
      console.error('Error saving savings goal:', e)
      return goal
    }
  }

  // Update savings goal in Firebase
  const updateSavingsGoal = async (goalId, updates) => {
    if (!db || !userId) return
    try {
      const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
      const goalRef = doc(db, `artifacts/${appId}/users/${userId}/savingsGoals/${goalId}`)
      await updateDoc(goalRef, { ...updates, updatedAt: serverTimestamp() })
    } catch (e) {
      console.error('Error updating savings goal:', e)
    }
  }

  // Delete savings goal from Firebase
  const deleteSavingsGoal = async (goalId) => {
    if (!db || !userId) return
    try {
      const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
      const goalRef = doc(db, `artifacts/${appId}/users/${userId}/savingsGoals/${goalId}`)
      await deleteDoc(goalRef)
    } catch (e) {
      console.error('Error deleting savings goal:', e)
    }
  }

  const saveFlexibleBudget = async (category, amount) => {
    try {
      if (!db || !userId) return
      const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
      const mk = budgetsMonthKey || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const ref = doc(db, `artifacts/${appId}/users/${userId}/budgets/${mk}/categories/${encodeURIComponent(category)}`)
      const numeric = Number(amount) || 0
      await setDoc(ref, { category, amount: numeric, spendingType: 'flexible', updatedAt: serverTimestamp() }, { merge: true })
      setBudgetsFlexible(prev => ({ ...prev, [category]: numeric }))
      showNotification && showNotification('Budget saved', 'success')
    } catch (e) {
      console.error('Error saving budget:', e)
      showNotification && showNotification('Error saving budget', 'error')
    }
  }
  const saveFixedBudget = async (category, amount) => {
    try {
      if (!db || !userId) return
      const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
      const mk = budgetsMonthKey || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const ref = doc(db, `artifacts/${appId}/users/${userId}/budgets/${mk}/categories/${encodeURIComponent(category)}`)
      const numeric = Number(amount) || 0
      await setDoc(ref, { category, amount: numeric, spendingType: 'fixed', updatedAt: serverTimestamp() }, { merge: true })
      setBudgetsFixed(prev => ({ ...prev, [category]: numeric }))
      showNotification && showNotification('Budget saved', 'success')
    } catch (e) {
      console.error('Error saving budget:', e)
      showNotification && showNotification('Error saving budget', 'error')
    }
  }

  const saveIncomeBudget = async (category, amount) => {
    try {
      if (!db || !userId) return
      const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
      const mk = budgetsMonthKey || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const ref = doc(db, `artifacts/${appId}/users/${userId}/budgets/${mk}/categories/${encodeURIComponent(category)}`)
      const numeric = Number(amount) || 0
      await setDoc(ref, { category, amount: numeric, spendingType: 'income', updatedAt: serverTimestamp() }, { merge: true })
      setBudgetsIncome(prev => ({ ...prev, [category]: numeric }))
      showNotification && showNotification('Budget saved', 'success')
    } catch (e) {
      console.error('Error saving budget:', e)
      showNotification && showNotification('Error saving budget', 'error')
    }
  }



	// Track the previously selected day to detect when it changes
	const prevSelectedDayRef = useRef(null)

	// Update transaction date to today when opening modal for new transaction
  useEffect(() => {
    if (isEditing && !editingId) {
      // Opening modal for new transaction, set date to today
      setTransactionDate(new Date().toISOString().split('T')[0])
    }
  }, [isEditing, editingId])

  // Update transaction date when a day is selected in the calendar (only on initial selection)
  useEffect(() => {
    // Only set the date if:
    // 1. A day is selected
    // 2. We're NOT editing an existing transaction (editingId is null)
    // 3. The selected day has changed (different from previous)
    if (selectedDay && !editingId && prevSelectedDayRef.current !== selectedDay.day) {
      // When a day is selected for the first time, set the transaction date to that day
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const dateString = new Date(year, month, selectedDay.day).toISOString().split('T')[0]
      setTransactionDate(dateString)
      prevSelectedDayRef.current = selectedDay.day
    }
    // When modal closes, reset the ref
    if (!selectedDay) {
      prevSelectedDayRef.current = null
    }
  }, [selectedDay, editingId, currentMonth])



  // Load paid-off debts from Firebase on mount
  useEffect(() => {
    if (!db || !userId) {
      // Fallback to localStorage if no Firebase
      const savedPaidOffDebts = localStorage.getItem('paidOffDebts')
      if (savedPaidOffDebts) {
        try {
          setPaidOffDebts(JSON.parse(savedPaidOffDebts))
        } catch (error) {
          console.error('Error loading paid-off debts from localStorage:', error)
        }
      }
      return
    }
    ;(async () => {
      try {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const prefsRef = doc(db, `artifacts/${appId}/users/${userId}/preferences/settings`)
        const prefsSnap = await getDoc(prefsRef)
        if (prefsSnap.exists()) {
          const data = prefsSnap.data()
          if (data.paidOffDebts) {
            setPaidOffDebts(data.paidOffDebts)
          }
        }
      } catch (e) {
        console.error('Error loading paid-off debts from Firebase:', e)
        // Fallback to localStorage
        const savedPaidOffDebts = localStorage.getItem('paidOffDebts')
        if (savedPaidOffDebts) {
          try {
            setPaidOffDebts(JSON.parse(savedPaidOffDebts))
          } catch (error) {
            console.error('Error loading paid-off debts from localStorage:', error)
          }
        }
      }
    })()
  }, [db, userId])

  // Show notification helper - memoized
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // Dynamic greeting based on time of day and user name
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    let timeGreeting = 'Good morning'
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon'
    } else if (hour >= 17 || hour < 5) {
      timeGreeting = 'Good evening'
    }
    // Get user name from profile or fallback to displayName or email
    const fullName = userProfile?.name || user?.displayName || user?.email?.split('@')[0] || 'there'
    // Extract just the first name (split by space and take first part)
    const firstName = fullName.split(' ')[0]
    return `${timeGreeting}, ${firstName}! 👋`
  }, [userProfile, user])

  // Check if user needs to complete their profile (no name set)
  useEffect(() => {
    // Only show after initial load and if user is logged in
    if (!user || !userId) return

    // Check if user has a name set
    const hasName = userProfile?.name || user?.displayName

    // If no name, show the complete profile modal after a short delay
    if (!hasName) {
      const timer = setTimeout(() => {
        setShowCompleteProfileModal(true)
      }, 1000) // Wait 1 second so user sees the dashboard first
      return () => clearTimeout(timer)
    }
  }, [user, userId, userProfile])

  // Handle saving profile name from the complete profile modal
  const handleSaveProfileName = useCallback(async () => {
    if (!profileNameInput.trim()) {
      showNotification('Please enter your name', 'error')
      return
    }

    setProfileSaving(true)
    try {
      // Update Firebase Auth profile
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { displayName: profileNameInput.trim() })
      }

      // Update Firestore user profile
      if (db && userId) {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile/info`)
        await setDoc(userProfileRef, {
          name: profileNameInput.trim(),
          email: user?.email || '',
          updatedAt: serverTimestamp()
        }, { merge: true })

        // Also save to flat mailing_list collection for easy export/email marketing
        const mailingListRef = doc(db, `artifacts/${appId}/mailing_list/${userId}`)
        await setDoc(mailingListRef, {
          name: profileNameInput.trim(),
          email: user?.email || '',
          userId: userId,
          signupDate: serverTimestamp(),
          source: 'profile_completion',
          marketingOptIn: true
        }, { merge: true })
      }

      // Update local state
      setUserProfile(prev => ({
        ...prev,
        name: profileNameInput.trim()
      }))

      // Use just the first name in the welcome message
      const firstName = profileNameInput.trim().split(' ')[0]
      showNotification('Welcome to Keel, ' + firstName + '! 🎉', 'success')
      setShowCompleteProfileModal(false)
      setProfileNameInput('')
    } catch (error) {
      console.error('Error saving profile:', error)
      showNotification('Failed to save profile', 'error')
    } finally {
      setProfileSaving(false)
    }
  }, [profileNameInput, auth, db, userId, user, showNotification, setUserProfile])

  // Handle opening My Account modal
  const handleOpenAccountModal = useCallback(() => {
    setAccountName(userProfile?.name || user?.displayName || '')
    setAccountEmail(user?.email || '')
    setShowAccountModal(true)
  }, [userProfile, user])

  // Handle saving account changes
  const handleSaveAccountChanges = useCallback(async () => {
    if (!accountName.trim()) {
      showNotification('Name cannot be empty', 'error')
      return
    }

    setAccountSaving(true)
    try {
      // Update Firebase Auth profile
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { displayName: accountName.trim() })
      }

      // Update Firestore user profile
      if (db && userId) {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile/info`)
        await setDoc(userProfileRef, {
          name: accountName.trim(),
          email: accountEmail,
          updatedAt: serverTimestamp()
        }, { merge: true })

        // Also update mailing_list collection to keep it in sync
        const mailingListRef = doc(db, `artifacts/${appId}/mailing_list/${userId}`)
        await setDoc(mailingListRef, {
          name: accountName.trim(),
          email: accountEmail,
          userId: userId,
          updatedAt: serverTimestamp()
        }, { merge: true })
      }

      // Update local state
      setUserProfile(prev => ({
        ...prev,
        name: accountName.trim()
      }))

      showNotification('Account updated successfully!', 'success')
      setShowAccountModal(false)
    } catch (error) {
      console.error('Error updating account:', error)
      showNotification('Failed to update account', 'error')
    } finally {
      setAccountSaving(false)
    }
  }, [accountName, accountEmail, auth, db, userId, showNotification, setUserProfile])

  // Handle marking a debt as paid off - memoized
  // When a debt is marked as paid off, save to Firebase
  // Note: We no longer delete the transaction - just track it as paid off so it persists
  const handleMarkDebtPaidOff = useCallback(async (debtId, debtName, transactionId) => {
    const newPaidOffState = !paidOffDebts[debtId]
    const updatedPaidOffDebts = {
      ...paidOffDebts,
      [debtId]: newPaidOffState
    }

    // Update local state immediately
    setPaidOffDebts(updatedPaidOffDebts)

    // Save to localStorage as backup
    localStorage.setItem('paidOffDebts', JSON.stringify(updatedPaidOffDebts))

    // Save to Firebase
    if (db && userId) {
      try {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const prefsRef = doc(db, `artifacts/${appId}/users/${userId}/preferences/settings`)
        await setDoc(prefsRef, { paidOffDebts: updatedPaidOffDebts, updatedAt: serverTimestamp() }, { merge: true })
        console.log('Saved paidOffDebts to Firebase:', updatedPaidOffDebts)
      } catch (error) {
        console.error('Error saving paid-off debts to Firebase:', error)
      }
    }

    if (newPaidOffState) {
      // Show celebration modal with confetti
      setCelebratingDebtName(debtName)
      setShowDebtPaidOffModal(true)
      showNotification(`🎉 ${debtName} marked as paid off!`, 'success')
    } else {
      showNotification(`${debtName} unmarked as paid off`, 'info')
    }
  }, [paidOffDebts, db, userId, showNotification])

  // Handle month reset notification from App.jsx
  useEffect(() => {
    if (monthResetNotification) {
      setNotification({
        message: monthResetNotification.message,
        type: monthResetNotification.isError ? 'error' : 'success'
      })
      // Clear the notification after it's been displayed
      setTimeout(() => {
        setMonthResetNotification(null)
      }, 8000)
    }
  }, [monthResetNotification, setMonthResetNotification])

  // Filter transactions based on search and filter
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = (transaction.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterType === 'all' || transaction.type === filterType
      return matchesSearch && matchesFilter
    })
  }, [transactions, searchTerm, filterType])

	  // Sort filtered transactions by date (newest first) for Transactions section
	  const sortedFilteredTransactions = useMemo(() => {
	    return [...filteredTransactions].sort((a, b) =>
	      getCreatedAtTimestamp(b.createdAt) - getCreatedAtTimestamp(a.createdAt)
	    )
	  }, [filteredTransactions])

  // Calculate financial summaries using useMemo
  const totalIncome = useMemo(() => {
    return transactions
      .filter(transaction => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  }, [transactions])

  const totalExpense = useMemo(() => {
    return transactions
      .filter(transaction => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  }, [transactions])

  const totalBalance = useMemo(() => {
    return totalIncome - totalExpense
  }, [totalIncome, totalExpense])

  // Process data for expense breakdown - grouped by category
  const expenseChartData = useMemo(() => {
    const expenses = transactions.filter(transaction => transaction.type === 'expense')

    // Group expenses by category and sum amounts
    const groupedExpenses = expenses.reduce((acc, expense) => {
      const key = expense.category || 'Uncategorized'
      if (!acc[key]) {
        acc[key] = { name: key, value: 0, items: [] }
      }
      acc[key].value += expense.amount
      acc[key].items.push(expense)
      return acc
    }, {})

    // Convert to array and sort by amount (highest first)
    const sorted = Object.values(groupedExpenses)
      .sort((a, b) => b.value - a.value)

    return sorted
  }, [transactions])

  // Process data for income breakdown - TOP 6 + OTHER
  const incomeChartData = useMemo(() => {
    const incomes = transactions.filter(transaction => transaction.type === 'income')

    // Group incomes by description and sum amounts
    const groupedIncomes = incomes.reduce((acc, income) => {
      const key = income.description
      if (!acc[key]) {
        acc[key] = 0
      }
      acc[key] += income.amount
      return acc
    }, {})

    // Convert to array and sort by amount (highest first)
    const sorted = Object.entries(groupedIncomes)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Take top 6, group rest as "Other"
    if (sorted.length <= 6) {
      return sorted
    }

    const top6 = sorted.slice(0, 6)
    const others = sorted.slice(6)
    const otherTotal = others.reduce((sum, item) => sum + item.value, 0)

    if (otherTotal > 0) {
      top6.push({ name: 'Other', value: otherTotal })
    }

    return top6
  }, [transactions])

		  // Monthly trend data
		  const monthlyTrendData = useMemo(() => {
		    const monthlyData = {}
		    transactions.forEach(transaction => {
		      const date = getCreatedAtDate(transaction.createdAt)
		      if (!date) return
		      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

		      if (!monthlyData[monthKey]) {
		        monthlyData[monthKey] = { month: monthKey, income: 0, expense: 0 }
		      }

		      if (transaction.type === 'income') {
		        monthlyData[monthKey].income += transaction.amount
		      } else {
		        monthlyData[monthKey].expense += transaction.amount
		      }
		    })

		    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
		  }, [transactions])

	  // All transactions sorted by date (newest first) for Reports recent transactions table
	  const transactionsSortedByDateDesc = useMemo(() => {
	    return [...transactions].sort((a, b) =>
	      getCreatedAtTimestamp(b.createdAt) - getCreatedAtTimestamp(a.createdAt)
	    )
	  }, [transactions])

  // Recent transactions around today: if any today, show them first; otherwise start from the closest earlier date
  const recentTransactionsAroundToday = useMemo(() => {
    const sorted = [...transactions].sort((a, b) =>
      getCreatedAtTimestamp(b.createdAt) - getCreatedAtTimestamp(a.createdAt)
    )
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTs = today.getTime()
    let anchorIndex = sorted.findIndex(t => getCreatedAtTimestamp(t.createdAt) <= todayTs)
    if (anchorIndex === -1) anchorIndex = 0
    const window = sorted.slice(anchorIndex, anchorIndex + 5)
    return window.length > 0 ? window : sorted.slice(0, 5)
  }, [transactions])


  // Organize accounts by type (Credit Cards, Loans, Auto Loans, Student Loans, Other Debts)
  const accountsByType = useMemo(() => {
    const creditCards = []
    const loans = []
    const autoLoans = []
    const studentLoans = []
    const otherDebts = []
    const assets = []

    transactions.forEach(transaction => {
      // Categorize by type and category
      const category = (transaction.category || '').toLowerCase()
      const description = (transaction.description || '').toLowerCase()
      const type = transaction.type

      if (type === 'debt' || type === 'expense') {
        const accountData = {
          id: transaction.id,
          name: transaction.description,
          balance: transaction.remainingBalance || transaction.amount,
          amount: transaction.amount,
          interestRate: transaction.interestRate || 0,
          createdAt: transaction.createdAt,
          category: transaction.category
        }

        if (category.includes('credit') || category.includes('card')) {
          creditCards.push(accountData)
        } else if (category.includes('student')) {
          studentLoans.push(accountData)
        } else if (category.includes('auto') || category.includes('vehicle')) {
          autoLoans.push(accountData)
        } else if (category.includes('loan')) {
          loans.push(accountData)
        } else if (category.includes('debt')) {
          otherDebts.push(accountData)
        }
      } else if (type === 'income' || type === 'asset') {
        assets.push({
          id: transaction.id,
          name: transaction.description,
          balance: transaction.amount,
          createdAt: transaction.createdAt
        })
      }
    })

    return {
      creditCards: creditCards.sort((a, b) => b.balance - a.balance),
      loans: loans.sort((a, b) => b.balance - a.balance),
      autoLoans: autoLoans.sort((a, b) => b.balance - a.balance),
      studentLoans: studentLoans.sort((a, b) => b.balance - a.balance),
      otherDebts: otherDebts.sort((a, b) => b.balance - a.balance),
      assets: assets.sort((a, b) => b.balance - a.balance)
    }
  }, [transactions])

  // Calculate net worth
  const netWorth = useMemo(() => {
    const totalAssets = accountsByType.assets.reduce((sum, asset) => sum + asset.balance, 0)
    const totalCreditCardDebt = accountsByType.creditCards.reduce((sum, card) => sum + card.balance, 0)
    const totalLoans = accountsByType.loans.reduce((sum, loan) => sum + loan.balance, 0)
    const totalAutoLoans = accountsByType.autoLoans.reduce((sum, loan) => sum + loan.balance, 0)
    const totalStudentLoans = accountsByType.studentLoans.reduce((sum, loan) => sum + loan.balance, 0)
    const totalOtherDebts = accountsByType.otherDebts.reduce((sum, debt) => sum + debt.balance, 0)

    return {
      assets: totalAssets,
      creditCardDebt: totalCreditCardDebt,
      loans: totalLoans,
      autoLoans: totalAutoLoans,
      studentLoans: totalStudentLoans,
      otherDebts: totalOtherDebts,
      totalLiabilities: totalCreditCardDebt + totalLoans + totalAutoLoans + totalStudentLoans + totalOtherDebts,
      netWorth: totalAssets - (totalCreditCardDebt + totalLoans + totalAutoLoans + totalStudentLoans + totalOtherDebts)
    }
  }, [accountsByType])

  // Save current month's liability snapshot to Firebase
  useEffect(() => {
    if (!db || !userId || netWorth.totalLiabilities === 0) return

    const saveSnapshot = async () => {
      try {
        const now = new Date()
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const snapshotRef = doc(db, `artifacts/${appId}/users/${userId}/liabilitySnapshots/${monthKey}`)

        await setDoc(snapshotRef, {
          totalLiabilities: netWorth.totalLiabilities,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true })

        // Update local snapshots state
        setMonthlySnapshots(prev => {
          const existing = prev.find(s => s.monthKey === monthKey)
          if (existing) {
            return prev.map(s => s.monthKey === monthKey
              ? { ...s, totalLiabilities: netWorth.totalLiabilities }
              : s
            )
          }
          return [...prev, { monthKey, totalLiabilities: netWorth.totalLiabilities }]
        })
      } catch (e) {
        console.error('Error saving liability snapshot:', e)
      }
    }

    // Debounce the save to avoid too many writes
    const timeoutId = setTimeout(saveSnapshot, 2000)
    return () => clearTimeout(timeoutId)
  }, [db, userId, netWorth.totalLiabilities])

  // Liabilities chart data based on timeframe (using historical snapshots)
  const liabilitiesChartData = useMemo(() => {
    const today = new Date()
    const chartData = []

    if (liabilitiesTimeframe === '1month') {
      // Show days in current month - use current value for all days
      const daysBack = 5
      for (let i = daysBack; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        chartData.push({
          date: dateLabel,
          liabilities: netWorth.totalLiabilities
        })
      }
    } else {
      // Show months for 3 months, 6 months, 1 year using historical snapshots
      let monthsBack = 3
      if (liabilitiesTimeframe === '6months') {
        monthsBack = 6
      } else if (liabilitiesTimeframe === '1year') {
        monthsBack = 12
      }

      // Create a map of snapshots for quick lookup
      const snapshotMap = {}
      monthlySnapshots.forEach(s => {
        snapshotMap[s.monthKey] = s.totalLiabilities
      })

      for (let i = monthsBack - 1; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

        // Use historical snapshot if available, otherwise use current value for current month only
        let liabilityValue = null
        if (snapshotMap[monthKey] !== undefined) {
          liabilityValue = snapshotMap[monthKey]
        } else if (i === 0) {
          // Current month - use current value
          liabilityValue = netWorth.totalLiabilities
        }
        // Only add data point if we have a value (skip months before app was used)

        chartData.push({
          date: dateLabel,
          liabilities: liabilityValue
        })
      }
    }

    return chartData
  }, [liabilitiesTimeframe, netWorth.totalLiabilities, monthlySnapshots])

  // Monthly net income/expense data
  const monthlyNetData = useMemo(() => {
    const monthlyData = {}

    transactions.forEach(transaction => {
	      const date = getCreatedAtDate(transaction.createdAt)
	      if (!date) return
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, income: 0, expense: 0, netIncome: 0, liabilities: 0 }
      }

      if (transaction.type === 'income') {
        monthlyData[monthKey].income += transaction.amount
      } else if (transaction.type === 'expense' || transaction.type === 'debt') {
        monthlyData[monthKey].expense += transaction.amount
      }
    })

    // Calculate net income and liabilities for each month
    Object.values(monthlyData).forEach(month => {
      month.netIncome = month.income - month.expense
      // Liabilities is the total debt from accounts
      month.liabilities = netWorth.totalLiabilities
    })

    return Object.values(monthlyData)
      .sort((a, b) => {
        const aDate = new Date(a.month)
        const bDate = new Date(b.month)
        return aDate - bDate
      })
      .slice(-12) // Last 12 months
  }, [transactions, netWorth.totalLiabilities])

  // Get current month's net income
  const currentMonthNetIncome = useMemo(() => {
    if (monthlyNetData.length === 0) return 0
    return monthlyNetData[monthlyNetData.length - 1].netIncome
  }, [monthlyNetData])

  // Daily spending data for current month vs last month (cumulative, full month)
  const dailySpendingData = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    // Get last month
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1)
    const lastMonth = lastMonthDate.getMonth()
    const lastYear = lastMonthDate.getFullYear()
    const daysInLastMonth = new Date(lastYear, lastMonth + 1, 0).getDate()

    // Per-day amounts (will convert to cumulative later)
    const dailyThis = Array(daysInCurrentMonth + 1).fill(0)
    const dailyLast = Array(daysInCurrentMonth + 1).fill(0)

    transactions.forEach(transaction => {
      const date = getCreatedAtDate(transaction.createdAt)
      if (!date) return
      const y = date.getFullYear()
      const m = date.getMonth()
      const d = date.getDate()

      if (transaction.type === 'expense' || transaction.type === 'debt') {
        if (y === currentYear && m === currentMonth && d >= 1 && d <= daysInCurrentMonth) {
          dailyThis[d] += transaction.amount
        } else if (y === lastYear && m === lastMonth && d >= 1 && d <= daysInLastMonth) {
          if (d <= daysInCurrentMonth) dailyLast[d] += transaction.amount
        }
      }
    })

    // Build cumulative series for the entire month
    const result = []
    let cumThis = 0
    let cumLast = 0
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      cumThis += dailyThis[day] || 0
      cumLast += (day <= daysInLastMonth ? (dailyLast[day] || 0) : 0)
      result.push({
        day,
        dayLabel: `Day ${day}`,
        thisMonth: Number(cumThis.toFixed(2)),
        lastMonth: Number(cumLast.toFixed(2))
      })
    }

    return result
  }, [transactions])

  // Meta for spending chart (month labels and tick days)
  const spendingChartMeta = useMemo(() => {
    const now = new Date()
    const currentMonthName = now.toLocaleString('en-US', { month: 'long' })
    const currentYear = now.getFullYear()
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthName = lastMonthDate.toLocaleString('en-US', { month: 'long' })
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const baseTicks = [1, 4, 7, 10, 13, 16, 19, 22, 25, 30]
    const ticks = baseTicks.filter(d => d <= daysInCurrentMonth)
    return { currentMonthName, currentYear, lastMonthName, ticks }
  }, [])

  // Daily net cashflow (income - expenses/debts), cumulative
  const dailyCashflowNetData = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1)
    const lastMonth = lastMonthDate.getMonth()
    const lastYear = lastMonthDate.getFullYear()
    const daysInLastMonth = new Date(lastYear, lastMonth + 1, 0).getDate()

    const dailyThis = Array(daysInCurrentMonth + 1).fill(0)
    const dailyLast = Array(daysInCurrentMonth + 1).fill(0)

    transactions.forEach(transaction => {
      const date = getCreatedAtDate(transaction.createdAt)
      if (!date) return
      const y = date.getFullYear()
      const m = date.getMonth()
      const d = date.getDate()

      let delta = 0
      if (transaction.type === 'income') delta = transaction.amount
      else if (transaction.type === 'expense' || transaction.type === 'debt') delta = -transaction.amount
      else return

      if (y === currentYear && m === currentMonth && d >= 1 && d <= daysInCurrentMonth) {
        dailyThis[d] += delta
      } else if (y === lastYear && m === lastMonth && d >= 1 && d <= daysInLastMonth) {
        if (d <= daysInCurrentMonth) dailyLast[d] += delta
      }
    })

    const result = []
    let cumThis = 0
    let cumLast = 0
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      cumThis += dailyThis[day] || 0
      cumLast += (day <= daysInLastMonth ? (dailyLast[day] || 0) : 0)
      result.push({
        day,
        dayLabel: `Day ${day}`,
        thisMonth: Number(cumThis.toFixed(2)),
        lastMonth: Number(cumLast.toFixed(2))
      })
    }

    return result
  }, [transactions])

  const cashflowChartMeta = spendingChartMeta

  // Monthly cashflow data for the chart (for selected year)
  const monthlyCashflowData = useMemo(() => {
    const monthlyData = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Initialize all 12 months for the selected year
    for (let i = 0; i < 12; i++) {
      const monthKey = `${cashflowYear}-${String(i + 1).padStart(2, '0')}`
      monthlyData[monthKey] = {
        month: monthNames[i],
        monthNum: i + 1,
        income: 0,
        expense: 0,
        net: 0
      }
    }

    transactions.forEach(transaction => {
	      const date = getCreatedAtDate(transaction.createdAt)
	      if (!date) return
      const transYear = date.getFullYear()
      const transMonth = date.getMonth() + 1
      const monthKey = `${transYear}-${String(transMonth).padStart(2, '0')}`

      if (monthlyData[monthKey]) {
        const amt = Number(transaction.amount) || 0
        if (transaction.type === 'income') {
          monthlyData[monthKey].income += Math.abs(amt)
        } else if (transaction.type === 'expense' || transaction.type === 'debt') {
          monthlyData[monthKey].expense += Math.abs(amt)
        }
      }
    })

    // Calculate net for each month
    return Object.values(monthlyData).map(month => {
      const income = Math.round((month.income || 0) * 100) / 100
      const expense = Math.round((month.expense || 0) * 100) / 100
      return {
        ...month,
        income,
        expense,
        net: income - expense,
        expenseNeg: -expense,
      }
    })
  }, [transactions, cashflowYear])

  // Y-axis: symmetric domain in $1K steps and explicit ticks to avoid odd values/duplicates
  const cashflowScale = useMemo(() => {
    if (!monthlyCashflowData || monthlyCashflowData.length === 0) return { domain: [0, 0], ticks: [0] }
    const maxAbsRaw = monthlyCashflowData.reduce((m, d) => Math.max(m, Math.abs(d.income || 0), Math.abs(d.expense || 0)), 0)
    const maxAbs = Math.ceil(maxAbsRaw / 1000) * 1000 // round up to next $1K
    const domain = [-maxAbs, maxAbs]
    const ticks = []
    for (let t = -maxAbs; t <= maxAbs; t += 1000) ticks.push(t)
    return { domain, ticks }
  }, [monthlyCashflowData])

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const breakdown = {}

    transactions.forEach(transaction => {
      if (transaction.type === 'expense' || transaction.type === 'debt') {
        const category = transaction.category || 'Uncategorized'
        if (!breakdown[category]) {
          breakdown[category] = { category, amount: 0, percentage: 0 }
        }
        breakdown[category].amount += transaction.amount
      }
    })

    const totalExpenses = Object.values(breakdown).reduce((sum, item) => sum + item.amount, 0)

    return Object.values(breakdown)
      .map(item => ({
        ...item,
        percentage: totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions])

  // Income breakdown by category
  const incomeBreakdown = useMemo(() => {
    const breakdown = {}

    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        const category = transaction.category || 'Other Income'
        if (!breakdown[category]) {
          breakdown[category] = { category, amount: 0, percentage: 0 }
        }
        breakdown[category].amount += transaction.amount
      }
    })

    const totalIncome = Object.values(breakdown).reduce((sum, item) => sum + item.amount, 0)

    return Object.values(breakdown)
      .map(item => ({
        ...item,
        percentage: totalIncome > 0 ? ((item.amount / totalIncome) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions])

  // Current month stats
  const currentMonthStats = useMemo(() => {
    const currentMonth = new Date()
    const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`

    let totalIncome = 0
    let totalExpenses = 0

    transactions.forEach(transaction => {
	      const transDate = getCreatedAtDate(transaction.createdAt)
	      if (!transDate) return
      const transMonthKey = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`

      if (transMonthKey === monthKey) {
        const amt = Number(transaction.amount) || 0
        if (transaction.type === 'income') {
          totalIncome += Math.abs(amt)
        } else if (transaction.type === 'expense' || transaction.type === 'debt') {
          totalExpenses += Math.abs(amt)
        }
      }
    })

    // round to cents to avoid tiny float residues
    totalIncome = Math.round(totalIncome * 100) / 100
    totalExpenses = Math.round(totalExpenses * 100) / 100

    return {
      income: totalIncome,
      expenses: totalExpenses,
      net: totalIncome - totalExpenses,
      savingsRate: totalIncome > 0 ? ((((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1)) : 0
    }
  }, [transactions])

  // Budget data by category
  const budgetData = useMemo(() => {
    const currentMonth = new Date()
    const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`

    const incomeCategories = {}
    const expenseCategories = {}

    transactions.forEach(transaction => {
	      const transDate = getCreatedAtDate(transaction.createdAt)
	      if (!transDate) return
      const transMonthKey = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`

      if (transMonthKey === monthKey) {
        // For income, use category if available, otherwise use description
        // For expenses, use category if available, otherwise use 'Uncategorized'
        let category
        if (transaction.type === 'income') {
          category = transaction.category || transaction.description || 'Uncategorized'
        } else {
          category = transaction.category || 'Uncategorized'
        }

        if (transaction.type === 'income') {
          if (!incomeCategories[category]) {
            incomeCategories[category] = { category, budget: 0, actual: 0 }
          }
          incomeCategories[category].actual += transaction.amount
        } else if (transaction.type === 'expense' || transaction.type === 'debt') {
          if (!expenseCategories[category]) {
            expenseCategories[category] = { category, budget: 0, actual: 0 }
          }
          expenseCategories[category].actual += transaction.amount
        }
      }
    })

    return {
      income: Object.values(incomeCategories),
      expenses: Object.values(expenseCategories)
    }
  }, [transactions])

  // Memoized reports summary stats - avoids repeated filtering in render
  const reportsSummaryStats = useMemo(() => {
    const toTs = (createdAt) => {
      if (typeof createdAt === 'string') {
        const [y, m, d] = createdAt.split('-')
        return new Date(y, parseInt(m) - 1, parseInt(d)).getTime()
      }
      return new Date(createdAt).getTime()
    }

    const calcStats = (filtered) => {
      if (filtered.length === 0) {
        return {
          count: 0,
          largest: 0,
          average: 0,
          totalIncome: 0,
          totalSpending: 0,
          firstDate: 'N/A',
          lastDate: 'N/A'
        }
      }
      const amounts = filtered.map(t => t.amount)
      const timestamps = filtered.map(t => toTs(t.createdAt))
      const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const spending = filtered.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0)
      const minTs = Math.min(...timestamps)
      const maxTs = Math.max(...timestamps)

      return {
        count: filtered.length,
        largest: Math.max(...amounts, 0),
        average: amounts.reduce((a, b) => a + b, 0) / filtered.length,
        totalIncome: income,
        totalSpending: spending,
        firstDate: new Date(minTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        lastDate: new Date(maxTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
    }

    return {
      spending: calcStats(transactions.filter(t => t.type === 'expense')),
      income: calcStats(transactions.filter(t => t.type === 'income')),
      all: calcStats(transactions)
    }
  }, [transactions])

  // Memoized active reports stats based on selected tab
  const activeReportsStats = useMemo(() => {
    if (reportsTab === 'spending') return reportsSummaryStats.spending
    if (reportsTab === 'income') return reportsSummaryStats.income
    return reportsSummaryStats.all
  }, [reportsTab, reportsSummaryStats])

  // Memoized Sankey chart data - avoids heavy inline computation
  const sankeyChartData = useMemo(() => {
    const expenseColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#a855f7']
    const expenseIndexMap = new Map()
    budgetData.expenses.forEach((item, idx) => {
      expenseIndexMap.set(item.category, idx)
    })

    const sortedIncome = [...budgetData.income].sort((a, b) => b.actual - a.actual)
    const sortedExpenses = [...budgetData.expenses].sort((a, b) => b.actual - a.actual)

    const nodes = []
    sortedIncome.forEach((item) => {
      nodes.push({ id: item.category, color: '#10b981' })
    })
    nodes.push({ id: 'Total Income', color: '#06b6d4' })
    sortedExpenses.forEach((item) => {
      const idx = expenseIndexMap.get(item.category) ?? 0
      nodes.push({ id: item.category, color: expenseColors[idx % expenseColors.length] })
    })

    const links = []
    sortedIncome.forEach((item) => {
      links.push({ source: item.category, target: 'Total Income', value: item.actual })
    })
    sortedExpenses.forEach((item) => {
      links.push({ source: 'Total Income', target: item.category, value: item.actual })
    })

    return { nodes, links }
  }, [budgetData])

  // Fixed and Flexible expenses breakdown
  const spendingTypeBreakdown = useMemo(() => {
    const currentMonth = new Date()
    const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`

    const fixedExpenses = {}
    const flexibleExpenses = {}

    // Build actuals from transactions for current month
    transactions.forEach(transaction => {
      const transDate = getCreatedAtDate(transaction.createdAt)
      if (!transDate) return
      const transMonthKey = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`
      if (transMonthKey !== monthKey || transaction.type !== 'expense') return

      const category = transaction.category || 'Uncategorized'
      const spendingType = transaction.spendingType || 'flexible'
      if (spendingType === 'fixed') {
        if (!fixedExpenses[category]) fixedExpenses[category] = { category, budget: 0, actual: 0 }
        fixedExpenses[category].actual += transaction.amount
      } else {
        if (!flexibleExpenses[category]) flexibleExpenses[category] = { category, budget: 0, actual: 0 }
        flexibleExpenses[category].actual += transaction.amount
      }
    })

    // Merge saved budgets (Firestore) - override any budget derived from transactions
    Object.entries(budgetsFixed || {}).forEach(([category, amount]) => {
      if (!fixedExpenses[category]) fixedExpenses[category] = { category, budget: 0, actual: 0 }
      fixedExpenses[category].budget = amount || 0
    })
    Object.entries(budgetsFlexible || {}).forEach(([category, amount]) => {
      if (!flexibleExpenses[category]) flexibleExpenses[category] = { category, budget: 0, actual: 0 }
      flexibleExpenses[category].budget = amount || 0
    })

    // Build arrays (all items)
    const fixedAll = Object.values(fixedExpenses).sort((a, b) => b.actual - a.actual)
    const flexibleAll = Object.values(flexibleExpenses).sort((a, b) => b.actual - a.actual)

    // Filter to only include items with budgets and recalculate totals
    const fixedWithBudget = fixedAll.filter(item => (item.budget || 0) > 0)
    const flexibleWithBudget = flexibleAll.filter(item => (item.budget || 0) > 0)

    const totalFixedBudgetWithBudget = fixedWithBudget.reduce((sum, item) => sum + (item.budget || 0), 0)
    const totalFixedActualWithBudget = fixedWithBudget.reduce((sum, item) => sum + (item.actual || 0), 0)
    const totalFlexibleBudgetWithBudget = flexibleWithBudget.reduce((sum, item) => sum + (item.budget || 0), 0)
    const totalFlexibleActualWithBudget = flexibleWithBudget.reduce((sum, item) => sum + (item.actual || 0), 0)

    const totalFixedBudgetAll = fixedAll.reduce((sum, item) => sum + (item.budget || 0), 0)
    const totalFixedActualAll = fixedAll.reduce((sum, item) => sum + (item.actual || 0), 0)
    const totalFlexibleBudgetAll = flexibleAll.reduce((sum, item) => sum + (item.budget || 0), 0)
    const totalFlexibleActualAll = flexibleAll.reduce((sum, item) => sum + (item.actual || 0), 0)

    // Unbudgeted summary (across fixed + flexible)
    const fixedUnbudgeted = fixedAll.filter(item => (item.budget || 0) <= 0)
    const flexibleUnbudgeted = flexibleAll.filter(item => (item.budget || 0) <= 0)
    const unbudgetedTotals = {
      count: fixedUnbudgeted.length + flexibleUnbudgeted.length,
      budget: fixedUnbudgeted.reduce((s, i) => s + (i.budget || 0), 0) + flexibleUnbudgeted.reduce((s, i) => s + (i.budget || 0), 0),
      actual: fixedUnbudgeted.reduce((s, i) => s + (i.actual || 0), 0) + flexibleUnbudgeted.reduce((s, i) => s + (i.actual || 0), 0)
    }

    return {
      fixed: fixedWithBudget,
      flexible: flexibleWithBudget,
      fixedAll,
      flexibleAll,
      totalFixedBudget: totalFixedBudgetWithBudget,
      totalFixedActual: totalFixedActualWithBudget,
      totalFlexibleBudget: totalFlexibleBudgetWithBudget,
      totalFlexibleActual: totalFlexibleActualWithBudget,
      totalsAll: {
        totalFixedBudgetAll,
        totalFixedActualAll,
        totalFlexibleBudgetAll,
        totalFlexibleActualAll
      },
      unbudgetedTotals
    }
  }, [transactions, budgetsFlexible, budgetsFixed])
  // Income breakdown (budget vs actual) for current month
  const incomeBudgetBreakdown = useMemo(() => {
    const currentMonth = new Date()
    const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`

    const incomes = {}

    // Actuals from transactions
    transactions.forEach(t => {
      const d = getCreatedAtDate(t.createdAt)
      if (!d) return
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (mk !== monthKey || t.type !== 'income') return
      const category = t.category || 'Other Income'
      if (!incomes[category]) incomes[category] = { category, budget: 0, actual: 0 }
      incomes[category].actual += t.amount
    })

    // Merge saved budgets
    Object.entries(budgetsIncome || {}).forEach(([category, amount]) => {
      if (!incomes[category]) incomes[category] = { category, budget: 0, actual: 0 }
      incomes[category].budget = amount || 0
    })

    const incomeAll = Object.values(incomes).sort((a, b) => b.actual - a.actual)
    const incomeWithBudget = incomeAll.filter(item => (item.budget || 0) > 0)

    const totalIncomeBudgetAll = incomeAll.reduce((sum, item) => sum + (item.budget || 0), 0)
    const totalIncomeActualAll = incomeAll.reduce((sum, item) => sum + (item.actual || 0), 0)
    const totalIncomeBudget = incomeWithBudget.reduce((sum, item) => sum + (item.budget || 0), 0)
    const totalIncomeActual = incomeWithBudget.reduce((sum, item) => sum + (item.actual || 0), 0)

    return {
      income: incomeWithBudget,
      incomeAll,
      totalsAll: { totalIncomeBudgetAll, totalIncomeActualAll },
      totals: { totalIncomeBudget, totalIncomeActual }
    }
  }, [transactions, budgetsIncome])


  // Debt Avalanche Calculator - sorted by interest rate (highest first)
  const debtAvalancheData = useMemo(() => {
    const debts = transactions.filter(t =>
      t.type === 'expense' &&
      t.remainingBalance &&
      t.remainingBalance > 0 &&
      (t.category === 'Credit Card Payment' || t.category === 'Auto Loan' || t.category === 'Student Loan' || t.interestRate)
    )

    // Sort by interest rate (highest first)
    const sorted = debts.sort((a, b) => {
      const rateA = a.interestRate || 0
      const rateB = b.interestRate || 0
      return rateB - rateA
    })

    return sorted.map((debt, index) => ({
      ...debt,
      priority: index + 1,
      monthlyInterest: (debt.remainingBalance * (debt.interestRate || 0)) / 100 / 12
    }))
  }, [transactions])

  // Colors for charts - keeping your simple color scheme
  const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16']
  const INCOME_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6']

  // Calculate Debt Snowball (smallest balance first)
  // Professional algorithm: minimum payments on all + extra to target debt
  const calculateSnowball = (debts, totalMonthlyPayment) => {
    // Sort by balance (smallest first)
    const sortedDebts = [...debts].sort((a, b) => a.remainingBalance - b.remainingBalance)

    // Initialize debt tracking
    const debtsCopy = sortedDebts.map(d => ({
      ...d,
      startingBalance: d.remainingBalance,
      minPayment: d.amount || Math.max(d.remainingBalance * 0.02, 25),
      totalInterest: 0,
      totalPaid: 0,
      payoffMonth: null,
      isPaidOff: false
    }))

    let totalInterest = 0
    let months = 0

    while (debtsCopy.some(d => !d.isPaidOff) && months < 600) {
      months++

      // Step 1: Apply interest to all active debts
      debtsCopy.forEach(debt => {
        if (!debt.isPaidOff && debt.remainingBalance > 0) {
          const monthlyInterest = (debt.remainingBalance * (debt.interestRate || 0)) / 100 / 12
          totalInterest += monthlyInterest
          debt.totalInterest += monthlyInterest
          debt.remainingBalance += monthlyInterest
        }
      })

      // Step 2: Calculate total minimum payments needed
      let totalMinPayments = 0
      debtsCopy.forEach(debt => {
        if (!debt.isPaidOff && debt.remainingBalance > 0) {
          totalMinPayments += Math.min(debt.minPayment, debt.remainingBalance)
        }
      })

      // Step 3: Allocate payments - minimums first, then extra to target debt
      let remainingPayment = totalMonthlyPayment

      // Pay minimums on all debts
      debtsCopy.forEach(debt => {
        if (!debt.isPaidOff && debt.remainingBalance > 0 && remainingPayment > 0) {
          const minPaymentAmount = Math.min(debt.minPayment, debt.remainingBalance)
          const actualPayment = Math.min(minPaymentAmount, remainingPayment)
          debt.remainingBalance -= actualPayment
          debt.totalPaid += actualPayment
          remainingPayment -= actualPayment

          // Mark as paid off if minimum payment paid it off
          if (debt.remainingBalance <= 0) {
            debt.isPaidOff = true
            debt.payoffMonth = months
          }
        }
      })

      // Step 4: Apply remaining payment to first unpaid debt (Snowball = smallest balance)
      for (let i = 0; i < debtsCopy.length; i++) {
        if (!debtsCopy[i].isPaidOff && debtsCopy[i].remainingBalance > 0 && remainingPayment > 0) {
          const extraPaymentAmount = Math.min(remainingPayment, debtsCopy[i].remainingBalance)
          debtsCopy[i].remainingBalance -= extraPaymentAmount
          debtsCopy[i].totalPaid += extraPaymentAmount
          remainingPayment -= extraPaymentAmount

          // Mark as paid off and record month
          if (debtsCopy[i].remainingBalance <= 0) {
            debtsCopy[i].isPaidOff = true
            debtsCopy[i].payoffMonth = months
          }
          break
        }
      }

      // Check if all debts are paid off
      if (debtsCopy.every(d => d.isPaidOff)) {
        break
      }
    }

    return {
      method: 'Snowball',
      totalMonths: months,
      totalInterest: Math.round(totalInterest * 100) / 100,
      debtFreeDate: new Date(new Date().setMonth(new Date().getMonth() + months)),
      payoffSchedule: debtsCopy.map(d => ({
        ...d,
        totalInterest: Math.round(d.totalInterest * 100) / 100,
        totalPaid: Math.round(d.totalPaid * 100) / 100
      }))
    }
  }

  // Calculate Debt Avalanche (highest interest rate first)
  // Professional algorithm: minimum payments on all + extra to target debt
  const calculateAvalanche = (debts, totalMonthlyPayment) => {
    // Sort by interest rate (highest first)
    const sortedDebts = [...debts].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))

    // Initialize debt tracking
    const debtsCopy = sortedDebts.map(d => ({
      ...d,
      startingBalance: d.remainingBalance,
      minPayment: d.amount || Math.max(d.remainingBalance * 0.02, 25),
      totalInterest: 0,
      totalPaid: 0,
      payoffMonth: null,
      isPaidOff: false
    }))

    let totalInterest = 0
    let months = 0

    while (debtsCopy.some(d => !d.isPaidOff) && months < 600) {
      months++

      // Step 1: Apply interest to all active debts
      debtsCopy.forEach(debt => {
        if (!debt.isPaidOff && debt.remainingBalance > 0) {
          const monthlyInterest = (debt.remainingBalance * (debt.interestRate || 0)) / 100 / 12
          totalInterest += monthlyInterest
          debt.totalInterest += monthlyInterest
          debt.remainingBalance += monthlyInterest
        }
      })

      // Step 2: Calculate total minimum payments needed
      let totalMinPayments = 0
      debtsCopy.forEach(debt => {
        if (!debt.isPaidOff && debt.remainingBalance > 0) {
          totalMinPayments += Math.min(debt.minPayment, debt.remainingBalance)
        }
      })

      // Step 3: Allocate payments - minimums first, then extra to target debt
      let remainingPayment = totalMonthlyPayment

      // Pay minimums on all debts
      debtsCopy.forEach(debt => {
        if (!debt.isPaidOff && debt.remainingBalance > 0 && remainingPayment > 0) {
          const minPaymentAmount = Math.min(debt.minPayment, debt.remainingBalance)
          const actualPayment = Math.min(minPaymentAmount, remainingPayment)
          debt.remainingBalance -= actualPayment
          debt.totalPaid += actualPayment
          remainingPayment -= actualPayment

          // Mark as paid off if minimum payment paid it off
          if (debt.remainingBalance <= 0) {
            debt.isPaidOff = true
            debt.payoffMonth = months
          }
        }
      })

      // Step 4: Apply remaining payment to first unpaid debt (Avalanche = highest interest)
      for (let i = 0; i < debtsCopy.length; i++) {
        if (!debtsCopy[i].isPaidOff && debtsCopy[i].remainingBalance > 0 && remainingPayment > 0) {
          const extraPaymentAmount = Math.min(remainingPayment, debtsCopy[i].remainingBalance)
          debtsCopy[i].remainingBalance -= extraPaymentAmount
          debtsCopy[i].totalPaid += extraPaymentAmount
          remainingPayment -= extraPaymentAmount

          // Mark as paid off and record month
          if (debtsCopy[i].remainingBalance <= 0) {
            debtsCopy[i].isPaidOff = true
            debtsCopy[i].payoffMonth = months
          }
          break
        }
      }

      // Check if all debts are paid off
      if (debtsCopy.every(d => d.isPaidOff)) {
        break
      }
    }

    return {
      method: 'Avalanche',
      totalMonths: months,
      totalInterest: Math.round(totalInterest * 100) / 100,
      debtFreeDate: new Date(new Date().setMonth(new Date().getMonth() + months)),
      payoffSchedule: debtsCopy.map(d => ({
        ...d,
        totalInterest: Math.round(d.totalInterest * 100) / 100,
        totalPaid: Math.round(d.totalPaid * 100) / 100
      }))
    }
  }

  // Generate comparison when showing modal
  const generatePayoffComparison = useCallback(() => {
    const debts = transactions.filter(t => {
      if (t.type !== 'expense' || !t.remainingBalance || t.remainingBalance <= 0) {
        return false
      }

      // Only include credit cards and personal loans (not student loans or auto loans)
      // AND must have an interest rate
      if (!t.interestRate || t.interestRate <= 0) {
        return false
      }

      const category = (t.category || '').toLowerCase()
      const isStudentLoan = category.includes('student')
      const isAutoLoan = category.includes('auto') || category.includes('vehicle')
      const isCreditCardOrLoan = category.includes('credit') || category.includes('card') ||
                                  (category.includes('loan') && !isStudentLoan && !isAutoLoan) ||
                                  category.includes('mortgage')

      return isCreditCardOrLoan && !isStudentLoan && !isAutoLoan
    })

    if (debts.length === 0) {
      return null
    }

    const totalDebt = debts.reduce((sum, d) => sum + d.remainingBalance, 0)
    // Calculate total minimum payments from all debts
    const totalMinimumPayments = debts.reduce((sum, d) => {
      const minPayment = d.amount || Math.max(d.remainingBalance * 0.02, 25)
      return sum + minPayment
    }, 0)

    const snowball = calculateSnowball(debts, totalMinimumPayments)
    const avalanche = calculateAvalanche(debts, totalMinimumPayments)

    return {
      debts,
      totalDebt,
      monthlyPayment: totalMinimumPayments,
      snowball,
      avalanche,
      interestSavings: Math.round((snowball.totalInterest - avalanche.totalInterest) * 100) / 100,
      timeSavings: snowball.totalMonths - avalanche.totalMonths
    }
  }, [transactions])

  // Auto-generate payoff comparison when a method is already chosen and transactions are loaded
  useEffect(() => {
    if (chosenPayoffMethod && transactions.length > 0 && !payoffComparison) {
      const comparison = generatePayoffComparison()
      if (comparison) {
        setPayoffComparison(comparison)
      }
    }
  }, [chosenPayoffMethod, transactions, payoffComparison, generatePayoffComparison])


  const handleAddTransaction = async (e) => {
    e.preventDefault()

    if (!description.trim()) {
      console.error('Validation failed: Description cannot be empty')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      console.error('Validation failed: Amount must be greater than 0')
      return
    }

    if (!userId) {
      console.error('User not authenticated')
      return
    }

    try {
      if (isEditing) {
        // Update existing transaction
        await handleUpdateTransaction()
      } else {
        // Add new transaction
        if (db) {
          const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
          const transactionsRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`)

          // Use transaction date for non-recurring, or current time for recurring
          let createdAtDate
          if (isRecurring) {
            createdAtDate = serverTimestamp()
          } else {
            // Store the date string directly to avoid timezone issues
            createdAtDate = transactionDate
          }

          const transactionToAdd = {
            description: description.trim(),
            amount: parseFloat(amount),
            type,
            category: category.trim() || null,
            spendingType: type === 'expense' ? spendingType : null,
            budget: budget ? parseFloat(budget) : null,
            isRecurring: isRecurring,
            remainingBalance: remainingBalance ? parseFloat(remainingBalance) : null,
            interestRate: interestRate ? parseFloat(interestRate) : null,
            createdAt: createdAtDate,
          }
          await addDoc(transactionsRef, transactionToAdd)
        } else {
          // Use transaction date for non-recurring, or current time for recurring
          let createdAtTime = Date.now()
          if (!isRecurring) {
            // Store the date string directly to avoid timezone issues
            createdAtTime = transactionDate
          }

          const newTransaction = {
            id: Date.now(),
            description: description.trim(),
            amount: parseFloat(amount),
            type,
            category: category.trim() || null,
            spendingType: type === 'expense' ? spendingType : null,
            budget: budget ? parseFloat(budget) : null,
            isRecurring: isRecurring,
            remainingBalance: remainingBalance ? parseFloat(remainingBalance) : null,
            interestRate: interestRate ? parseFloat(interestRate) : null,
            createdAt: createdAtTime,
          }

          setTransactions([newTransaction, ...transactions])
        }
      }

      // Reset form
      setDescription('')
      setAmount('')
      setType('income')
      setCategory('')
      setSpendingType('flexible')
      setBudget('')
      setIsRecurring(false)
      setTransactionDate(new Date().toISOString().split('T')[0])
      setRemainingBalance('')
      setInterestRate('')
      setIsEditing(false)
      setEditingId(null)
    } catch (error) {
      console.error('Error adding transaction:', error)
    }
  }

  const handleUpdateTransaction = async () => {
    if (!userId || !editingId) return

    try {
      if (db) {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, editingId)

        // Use transaction date for non-recurring, or keep original for recurring
        let createdAtDate = undefined
        if (!isRecurring) {
          // Store the date string directly to avoid timezone issues
          createdAtDate = transactionDate
        }

        const updateData = {
          description: description.trim(),
          amount: parseFloat(amount),
          type,
          category: category.trim() || null,
          spendingType: type === 'expense' ? spendingType : null,
          budget: budget ? parseFloat(budget) : null,
          isRecurring: isRecurring,
          remainingBalance: remainingBalance ? parseFloat(remainingBalance) : null,
          interestRate: interestRate ? parseFloat(interestRate) : null,
        }

        // Only update createdAt if it's a non-recurring transaction
        if (!isRecurring) {
          updateData.createdAt = createdAtDate
        }
        await updateDoc(transactionRef, updateData)
      } else {
        setTransactions(transactions.map(t =>
          t.id === editingId
            ? {
                ...t,
                description: description.trim(),
                amount: parseFloat(amount),
                type,
                category: category.trim() || null,
                isRecurring: isRecurring,
                createdAt: isRecurring ? t.createdAt : new Date(transactionDate).getTime(),
                remainingBalance: remainingBalance ? parseFloat(remainingBalance) : null,
                interestRate: interestRate ? parseFloat(interestRate) : null,
              }
            : t
        ))
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
    }
  }

	  const handleEditTransaction = (transaction) => {
	    // Don't reload the form if we're already editing this transaction
	    if (editingId === transaction.id) {
      return
    }

    setDescription(transaction.description)
    setAmount(transaction.amount.toString())
    setType(transaction.type)
    setCategory(transaction.category || '')
    setSpendingType(transaction.spendingType || 'flexible')
    setBudget(transaction.budget ? transaction.budget.toString() : '')
    setIsRecurring(transaction.isRecurring || false)
    // Set transaction date from createdAt
    let dateValue = new Date().toISOString().split('T')[0]
    if (transaction.createdAt) {
      // Handle date strings (YYYY-MM-DD), Firestore Timestamp, and milliseconds
      if (typeof transaction.createdAt === 'string') {
        // Already a date string
        dateValue = transaction.createdAt
      } else if (typeof transaction.createdAt === 'number') {
        // Milliseconds timestamp
        dateValue = new Date(transaction.createdAt).toISOString().split('T')[0]
      } else if (transaction.createdAt.toDate) {
        // Firestore Timestamp object
        dateValue = transaction.createdAt.toDate().toISOString().split('T')[0]
      } else {
        // Fallback
        dateValue = new Date(transaction.createdAt).toISOString().split('T')[0]
      }
    }
    setTransactionDate(dateValue)
    setRemainingBalance(transaction.remainingBalance ? transaction.remainingBalance.toString() : '')
    setInterestRate(transaction.interestRate ? transaction.interestRate.toString() : '')
    setEditingId(transaction.id)
    setIsEditing(true)
  }



  const handleCancelEdit = useCallback(() => {
    setDescription('')
    setAmount('')
    setType('income')
    setCategory('')
    setIsRecurring(false)
    setTransactionDate(new Date().toISOString().split('T')[0])
    setRemainingBalance('')
    setInterestRate('')
    setIsEditing(false)
    setEditingId(null)
  }, [])

  const handleDeleteTransaction = useCallback(async (transactionId) => {
    if (!userId) return

    try {
      if (db) {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, transactionId)
        await deleteDoc(transactionRef)
      } else {
        setTransactions(prev => prev.filter(t => t.id !== transactionId))
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
    }
  }, [userId, db])

  // Save to localStorage
  const handleSaveToLocal = useCallback(() => {
    try {
      localStorage.setItem('finance-tracker-transactions', JSON.stringify(transactions))
      showNotification(`Saved ${transactions.length} transactions to local storage!`, 'success')
    } catch (error) {
      console.error('Error saving to localStorage:', error)
      showNotification('Error saving data!', 'error')
    }
  }, [transactions, showNotification])

  // Load from localStorage
  const handleLoadFromLocal = useCallback(() => {
    try {
      const saved = localStorage.getItem('finance-tracker-transactions')
      if (saved) {
        const parsed = JSON.parse(saved)
        setTransactions(parsed)
        showNotification(`Loaded ${parsed.length} transactions from local storage!`, 'success')
      } else {
        showNotification('No saved data found!', 'warning')
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error)
      showNotification('Error loading data!', 'error')
    }
  }, [showNotification])

  // Export to JSON file
  const handleExportToFile = useCallback(() => {
    try {
      const dataStr = JSON.stringify(transactions, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `finance-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
      showNotification(`Exported ${transactions.length} transactions to file!`, 'success')
    } catch (error) {
      console.error('Error exporting:', error)
      showNotification('Error exporting data!', 'error')
    }
  }, [transactions, showNotification])

  // Import from JSON file
  const handleImportFromFile = useCallback(async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result)

        if (db && userId) {
          // If using Firebase, create new documents for imported transactions
          const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
          const transactionsRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`)

          for (const transaction of imported) {
            // Remove the old id and let Firebase generate a new one
            const { id, ...transactionData } = transaction
            await addDoc(transactionsRef, {
              ...transactionData,
              createdAt: serverTimestamp()
            })
          }
          showNotification(`Imported ${imported.length} transactions to Firebase!`, 'success')
        } else {
          // If not using Firebase, just update local state
          const validatedTransactions = imported.map(t => ({
            ...t,
            id: t.id || String(Date.now() + Math.random())
          }))
          setTransactions(validatedTransactions)
          localStorage.setItem('finance-tracker-transactions', JSON.stringify(validatedTransactions))
          showNotification(`Imported ${validatedTransactions.length} transactions!`, 'success')
        }
        // Clear the file input
        event.target.value = ''
      } catch (error) {
        console.error('Error importing:', error)
        showNotification('Error importing data! Make sure the file is valid JSON.', 'error')
      }
    }
    reader.readAsText(file)
  }, [db, userId, showNotification])

  // Calculate recurring obligations and debt totals
  const recurringObligations = useMemo(() => {
    const recurring = transactions.filter(t => t.isRecurring && t.type === 'expense')

    // Group by category
    const grouped = recurring.reduce((acc, t) => {
      const cat = t.category || 'Other'
      if (!acc[cat]) {
        acc[cat] = {
          category: cat,
          totalMonthly: 0,
          totalBalance: 0,
          paidCount: 0,
          paidAmount: 0,
          items: []
        }
      }
      acc[cat].totalMonthly += t.amount
      acc[cat].totalBalance += t.remainingBalance || 0
      // Check if paid this month
      if (t.paidDate) {
        const paidDate = new Date(t.paidDate)
        const now = new Date()
        if (paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear()) {
          acc[cat].paidCount += 1
          acc[cat].paidAmount += t.amount
        }
      }
      acc[cat].items.push(t)
      return acc
    }, {})

    return Object.values(grouped)
  }, [transactions])

  const totalMonthlyObligations = useMemo(() => {
    return recurringObligations.reduce((sum, cat) => sum + cat.totalMonthly, 0)
  }, [recurringObligations])

  const totalDebtBalance = useMemo(() => {
    return transactions
      .filter(t => t.remainingBalance && t.remainingBalance > 0)
      .reduce((sum, t) => sum + t.remainingBalance, 0)
  }, [transactions])

  // Payment tracking statistics
  const paymentStats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const recurringBills = transactions.filter(t => t.isRecurring && t.type === 'expense')
    const totalBills = recurringBills.length

    const paidBills = recurringBills.filter(t => {
      if (!t.paidDate) return false
      const paidDate = new Date(t.paidDate)
      return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear
    })

    const paidCount = paidBills.length
    const paidAmount = paidBills.reduce((sum, t) => sum + t.amount, 0)
    const unpaidAmount = totalMonthlyObligations - paidAmount
    const progressPercent = totalBills > 0 ? (paidCount / totalBills) * 100 : 0

    return {
      totalBills,
      paidCount,
      unpaidCount: totalBills - paidCount,
      paidAmount,
      unpaidAmount,
      progressPercent
    }
  }, [transactions, totalMonthlyObligations])

  // Calculate bills by due date for calendar
  const billsByDueDate = useMemo(() => {
    const billMap = {}
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthNum = now.getMonth()
    const viewingYear = currentMonth.getFullYear()
    const viewingMonth = currentMonth.getMonth()

    // Check if viewing a future month (don't show bills for future months)
    const isFutureMonth = viewingYear > currentYear ||
      (viewingYear === currentYear && viewingMonth > currentMonthNum)

    // Check if viewing a month before the app was started
    const appStartYear = appStartDate ? appStartDate.getFullYear() : currentYear
    const appStartMonth = appStartDate ? appStartDate.getMonth() : currentMonthNum
    const isBeforeAppStart = viewingYear < appStartYear ||
      (viewingYear === appStartYear && viewingMonth < appStartMonth)

    // Don't show bills for future months or months before app was used
    if (isFutureMonth || isBeforeAppStart) {
      return billMap
    }

    const recurringBills = transactions.filter(t => t.isRecurring && t.type === 'expense' && t.createdAt)

    recurringBills.forEach(bill => {
      // Extract day from createdAt (YYYY-MM-DD format)
      let dueDay
      if (typeof bill.createdAt === 'string') {
        const [, , day] = bill.createdAt.split('-')
        dueDay = parseInt(day)
      } else if (typeof bill.createdAt === 'number') {
        const date = new Date(bill.createdAt)
        dueDay = date.getDate()
      }

      if (!isNaN(dueDay) && dueDay >= 1 && dueDay <= 31) {
        if (!billMap[dueDay]) {
          billMap[dueDay] = []
        }
        billMap[dueDay].push(bill)
      }
    })

    return billMap
  }, [transactions, currentMonth, appStartDate])

  // Memoized upcoming bills for dashboard - avoids heavy inline computation
  const upcomingBills = useMemo(() => {
    const today = new Date()
    const currentDay = today.getDate()

    return transactions
      .filter(t => t.isRecurring && t.createdAt)
      .map(bill => {
        let dueDay
        if (typeof bill.createdAt === 'string') {
          const [, , day] = bill.createdAt.split('-')
          dueDay = parseInt(day)
        } else if (typeof bill.createdAt === 'number') {
          const date = new Date(bill.createdAt)
          dueDay = date.getDate()
        }

        return {
          ...bill,
          daysUntilDue: dueDay >= currentDay
            ? dueDay - currentDay
            : (new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - currentDay) + dueDay
        }
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, 5)
  }, [transactions])

  // Memoized goal modal calculations
  const goalMonthlyNeeded = useMemo(() => {
    if (!goalDeadline || !goalTargetAmount) return null
    const remaining = parseFloat(goalTargetAmount) - (parseFloat(goalCurrent) || 0)
    const daysLeft = Math.ceil((new Date(goalDeadline) - new Date()) / (1000 * 60 * 60 * 24))
    const monthsLeft = Math.ceil(daysLeft / 30)
    return monthsLeft > 0 ? remaining / monthsLeft : remaining
  }, [goalDeadline, goalTargetAmount, goalCurrent])

  // Memoized add money modal data
  const addMoneyModalData = useMemo(() => {
    if (!addMoneyGoalId) return null
    const goal = savingsGoals.find(g => g.id === addMoneyGoalId)
    if (!goal) return null
    const newTotal = goal.current + (parseFloat(addMoneyAmount) || 0)
    const newProgress = (newTotal / goal.targetAmount) * 100
    const currentProgress = (goal.current / goal.targetAmount) * 100
    return { goal, newTotal, newProgress, currentProgress }
  }, [addMoneyGoalId, savingsGoals, addMoneyAmount])

  // Memoized edit amount modal data
  const editAmountModalData = useMemo(() => {
    if (!editAmountGoalId) return null
    const goal = savingsGoals.find(g => g.id === editAmountGoalId)
    if (!goal) return null
    const newProgress = (parseFloat(editAmount) / goal.targetAmount) * 100
    return { goal, newProgress }
  }, [editAmountGoalId, savingsGoals, editAmount])

  // Get calendar data for current month
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        bills: billsByDueDate[day] || [],
        totalAmount: (billsByDueDate[day] || []).reduce((sum, bill) => sum + bill.amount, 0)
      })
    }

    return days
  }, [currentMonth, billsByDueDate])

  // Memoized today info for calendar - avoids creating new Date() on every cell render
  const todayInfo = useMemo(() => {
    const today = new Date()
    return {
      day: today.getDate(),
      month: today.getMonth(),
      year: today.getFullYear()
    }
  }, [])

  // Memoized bills list for calendar section - avoids heavy inline computation
  const billsThisMonth = useMemo(() => {
    return transactions.filter(t => {
      if (!t.isRecurring || !t.createdAt) return false
      let dueDay
      if (typeof t.createdAt === 'string') {
        const [, , day] = t.createdAt.split('-')
        dueDay = parseInt(day)
      } else if (typeof t.createdAt === 'number') {
        const date = new Date(t.createdAt)
        dueDay = date.getDate()
      }
      return !isNaN(dueDay) && dueDay >= 1 && dueDay <= 31
    }).sort((a, b) => {
      let dayA, dayB
      if (typeof a.createdAt === 'string') {
        const [, , day] = a.createdAt.split('-')
        dayA = parseInt(day)
      } else if (typeof a.createdAt === 'number') {
        const date = new Date(a.createdAt)
        dayA = date.getDate()
      }
      if (typeof b.createdAt === 'string') {
        const [, , day] = b.createdAt.split('-')
        dayB = parseInt(day)
      } else if (typeof b.createdAt === 'number') {
        const date = new Date(b.createdAt)
        dayB = date.getDate()
      }
      return dayA - dayB
    })
  }, [transactions])

  // Memoized calendar header stats
  const calendarHeaderStats = useMemo(() => {
    const totalDue = billsThisMonth.reduce((sum, t) => sum + t.amount, 0)
    return {
      count: billsThisMonth.length,
      totalDue,
      displayText: `${billsThisMonth.length} bills due • $${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    }
  }, [billsThisMonth])

  // Helper to get due day from a bill - memoized
  const getBillDueDay = useCallback((bill) => {
    if (typeof bill.createdAt === 'string') {
      const [, , day] = bill.createdAt.split('-')
      return parseInt(day)
    } else if (typeof bill.createdAt === 'number') {
      const date = new Date(bill.createdAt)
      return date.getDate()
    }
    return null
  }, [])

  // Helper to format transaction date for display - memoized
  const formatTransactionDate = useCallback((createdAt, format = 'short') => {
    if (!createdAt) return '-'
    if (typeof createdAt === 'string') {
      const [year, month, day] = createdAt.split('-')
      const date = new Date(year, parseInt(month) - 1, parseInt(day))
      if (format === 'short') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (format === 'month') {
        return date.toLocaleDateString('en-US', { month: 'short' })
      } else if (format === 'day') {
        return parseInt(day)
      } else if (format === 'full') {
        return `${String(parseInt(month)).padStart(2, '0')}/${String(parseInt(day)).padStart(2, '0')}/${year}`
      }
    } else if (typeof createdAt === 'number') {
      const date = new Date(createdAt)
      if (format === 'short') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (format === 'month') {
        return date.toLocaleDateString('en-US', { month: 'short' })
      } else if (format === 'day') {
        return date.getDate()
      } else if (format === 'full') {
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`
      }
    } else if (createdAt?.toDate) {
      const date = createdAt.toDate()
      if (format === 'short') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (format === 'month') {
        return date.toLocaleDateString('en-US', { month: 'short' })
      } else if (format === 'day') {
        return date.getDate()
      } else if (format === 'full') {
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`
      }
    }
    return '-'
  }, [])

  // Helper to format currency with sign - memoized
  const formatCurrencyWithSign = useCallback((value) => {
    const num = value || 0
    const abs = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2 })
    const sign = num < 0 ? '-' : ''
    return sign + '$' + abs
  }, [])

  // Check if a bill is paid this month - memoized
  const isBillPaidThisMonth = useCallback((transaction) => {
    if (!transaction || !transaction.paidDate) return false
    try {
      const paidDate = typeof transaction.paidDate === 'number'
        ? new Date(transaction.paidDate)
        : new Date(transaction.paidDate)
      const now = new Date()
      return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear()
    } catch (e) {
      console.error('Error checking bill paid status:', e)
      return false
    }
  }, [])

  // Pre-compute paid status for all bills to avoid repeated calculations during render
  const paidBillsMap = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const map = {}
    transactions.forEach(t => {
      if (t.paidDate) {
        try {
          const paidDate = new Date(t.paidDate)
          map[t.id] = paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear
        } catch (e) {
          map[t.id] = false
        }
      } else {
        map[t.id] = false
      }
    })
    return map
  }, [transactions])

  // Toggle paid status for a bill - called from BillCheckboxItem (UI already updated locally)
  const handleTogglePaid = useCallback((transactionId) => {
    if (!userId || !transactionId) return

    const id = String(transactionId)
    const timestamp = Date.now()
    const isPaidNow = paidBillsMap[id] || false
    const newPaidDate = isPaidNow ? null : timestamp

    // Update transactions in background
    setTransactions(prev => prev.map(t =>
      String(t.id) === id ? { ...t, paidDate: newPaidDate } : t
    ))

    // Firebase update in background
    if (db) {
      const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
      const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, id)
      updateDoc(transactionRef, { paidDate: newPaidDate }).catch(error => {
        console.error('Error updating payment status:', error)
        showNotification('Error updating payment status', 'error')
      })
    }
  }, [userId, db, showNotification, paidBillsMap, setTransactions])

  // Reset all bills for new month
  const handleResetAllBills = useCallback(async () => {
    if (!userId) return

    const nonRecurringTransactions = transactions.filter(t => !t.isRecurring)

    setDeleteConfirmData({
      type: 'reset',
      count: nonRecurringTransactions.length,
      onConfirm: async () => {
        try {
          if (db) {
            const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'

            // Delete non-recurring transactions only
            for (const transaction of nonRecurringTransactions) {
              const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, transaction.id)
              await deleteDoc(transactionRef)
            }
          } else {
            // Local state update - keep only recurring transactions
            setTransactions(prev => prev.filter(t => t.isRecurring))
          }
          showNotification('Month reset successfully! Recurring transactions kept.', 'success')
        } catch (error) {
          console.error('Error resetting month:', error)
          showNotification('Error resetting month', 'error')
        }
      }
    })
    setShowDeleteConfirmModal(true)
  }, [userId, transactions, db, showNotification])

  // Handle debt balance update
  const handleUpdateDebtBalance = useCallback(async () => {
    const newDebtAmount = parseFloat(debtModalValue)
    if (isNaN(newDebtAmount) || newDebtAmount < 0) {
      showNotification('Please enter a valid amount', 'error')
      return
    }

    const debtTransactions = transactions.filter(t => t.type === 'expense' && t.remainingBalance > 0)
    if (debtTransactions.length === 0) {
      showNotification('No debt transactions found. Please add a debt transaction first.', 'error')
      setShowDebtModal(false)
      return
    }

    const currentTotalDebt = debtTransactions.reduce((sum, t) => sum + (t.remainingBalance || 0), 0)
    const difference = newDebtAmount - currentTotalDebt

    try {
      if (db) {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        // Distribute the difference proportionally across all debt transactions
        for (const transaction of debtTransactions) {
          const proportion = (transaction.remainingBalance || 0) / currentTotalDebt
          const newBalance = Math.max(0, (transaction.remainingBalance || 0) + (difference * proportion))
          const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, transaction.id)
          await updateDoc(transactionRef, { remainingBalance: newBalance })
        }
      } else {
        // Update local state
        setTransactions(prev => prev.map(t => {
          if (t.type === 'expense' && t.remainingBalance > 0) {
            const proportion = (t.remainingBalance || 0) / currentTotalDebt
            const newBalance = Math.max(0, (t.remainingBalance || 0) + (difference * proportion))
            return { ...t, remainingBalance: newBalance }
          }
          return t
        }))
      }
      setShowDebtModal(false)
      setDebtModalValue('')
    } catch (error) {
      console.error('Error updating debt balance:', error)
      showNotification('Error updating debt balance', 'error')
    }
  }, [debtModalValue, transactions, db, userId, showNotification])



  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      {/* Sidebar Navigation */}
      <div id="sidebar-nav" className="w-64 bg-gray-50 border-r border-gray-200 p-6 fixed h-screen overflow-y-auto">
        <img src="/keel-logo.png" alt="Keel" className="w-28 h-auto mb-8" />
        <nav className="space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'accounts', label: 'Accounts', icon: '🏦' },
            { id: 'transactions', label: 'Transactions', icon: '💳' },
            { id: 'cashflow', label: 'Cash Flow', icon: '💰' },
            { id: 'reports', label: 'Reports', icon: '📈' },
            { id: 'budget', label: 'Budget', icon: '💼' },
            { id: 'savings', label: 'Savings', icon: '🎯' },
            { id: 'calendar', label: 'Calendar', icon: '📅' },
            { id: 'goals', label: 'Debt Payoff', icon: '💳' },
          ].map((section) => (
            <button
              id={`nav-${section.id}`}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 font-medium ${activeSection === section.id ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-200'}`}
            >
              <span className="text-xl">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-4 md:p-8 flex justify-center">
        {notification && (
          <div className={`fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white font-medium z-50 animate-fade-in ${notification.type === 'success' ? 'bg-green-500' : ''} ${notification.type === 'error' ? 'bg-red-500' : ''} ${notification.type === 'warning' ? 'bg-yellow-500' : ''}`}>
            {notification.message}
          </div>
        )}
        <div className="max-w-7xl w-full">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2 text-gray-900">
                  {activeSection === 'dashboard' && 'Finance Dashboard'}
                  {activeSection === 'accounts' && 'Accounts'}
                  {activeSection === 'transactions' && 'Transactions'}
                  {activeSection === 'cashflow' && 'Cash Flow'}
                  {activeSection === 'reports' && 'Reports'}
                  {activeSection === 'budget' && 'Budget'}
                  {activeSection === 'savings' && 'Savings Goals'}
                  {activeSection === 'calendar' && 'Calendar'}
                  {activeSection === 'goals' && 'Debt Payoff'}
                </h1>
                <p className="text-gray-600">
                  {activeSection === 'dashboard' && 'Track your income and expenses with ease'}
                  {activeSection === 'cashflow' && 'Visualize your money flow from income to expenses'}
                  {activeSection === 'savings' && 'Create and track your savings goals'}
                  {activeSection === 'calendar' && 'View and manage your upcoming bills'}
                  {activeSection !== 'dashboard' && activeSection !== 'cashflow' && activeSection !== 'savings' && activeSection !== 'calendar' && 'Manage your finances'}
                </p>
              </div>

              {/* Account, Help & Sign Out Buttons */}
              <div className="flex items-center gap-3">
                <button
                  id="help-tour-btn"
                  onClick={startTour}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer"
                  title="Take a tour of the app"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Help
                </button>
                <button
                  onClick={handleOpenAccountModal}
                  className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer"
                  title="My Account"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Account
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer"
                  title="Sign out"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Dashboard Section */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome Message */}
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">{greeting}</h1>
              </div>

              {/* Main Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Spending and Cashflow */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Spending Chart - Daily Comparison */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Spending — {spendingChartMeta.currentMonthName} {spendingChartMeta.currentYear}</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                          ${dailySpendingData.length > 0 ? dailySpendingData[dailySpendingData.length - 1].thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'} this month
                        </h3>
                      </div>
                      <span className="text-sm text-gray-600">{spendingChartMeta.currentMonthName} vs {spendingChartMeta.lastMonthName}</span>
                    </div>
                    {dailySpendingData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={dailySpendingData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorThisMonth" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#fb923c" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#fb923c" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis
                            dataKey="day"
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            tick={{ fill: '#9ca3af' }}
                            ticks={spendingChartMeta.ticks}
                            interval={0}
                            tickFormatter={(d) => `Day ${d}`}
                          />
                          <YAxis
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            tick={{ fill: '#9ca3af' }}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}K`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            labelFormatter={(label) => `Total Spending by Day ${label}`}
                            formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="lastMonth"
                            stroke="#d1d5db"
                            strokeWidth={2}
                            fill="none"
                            name="Last month"
                          />
                          <Area
                            type="monotone"
                            dataKey="thisMonth"
                            stroke="#fb923c"
                            strokeWidth={2}
                            fill="url(#colorThisMonth)"
                            name="This month"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-gray-400">
                        No data available yet
                      </div>
                    )}
                    {/* Legend */}
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-4 h-0.5 bg-gray-300" /> Last month
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-4 h-0.5 bg-orange-400" /> This month
                      </div>
                    </div>
                  </div>

                  {/* Monthly Cashflow */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Cashflow — {cashflowChartMeta.currentMonthName} {cashflowChartMeta.currentYear}</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                          ${dailyCashflowNetData.length > 0 ? dailyCashflowNetData[dailyCashflowNetData.length - 1].thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'} this month
                        </h3>
                      </div>
                      <span className="text-sm text-gray-600">{cashflowChartMeta.currentMonthName} vs {cashflowChartMeta.lastMonthName}</span>
                    </div>
                    {dailyCashflowNetData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={dailyCashflowNetData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorThisMonthCF" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis
                            dataKey="day"
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            tick={{ fill: '#9ca3af' }}
                            ticks={cashflowChartMeta.ticks}
                            interval={0}
                            tickFormatter={(d) => `Day ${d}`}
                          />
                          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} tick={{ fill: '#9ca3af' }} tickFormatter={(value) => `$${(value / 1000).toFixed(1)}K`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                            labelFormatter={(label) => `Total Net Cash Flow by Day ${label}`}
                            formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="lastMonth" stroke="#d1d5db" strokeWidth={2} fill="none" name="Last month" />
                          <Area type="monotone" dataKey="thisMonth" stroke="#06b6d4" strokeWidth={2} fill="url(#colorThisMonthCF)" name="This month" />

                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-gray-400">
                        No data available yet
                      </div>
                    )}
                    {/* Legend */}
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-4 h-0.5 bg-gray-300" /> Last month
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-4 h-0.5" style={{ backgroundColor: '#06b6d4' }} /> This month
                      </div>
                    </div>

                  </div>

                  {/* Recent Transactions */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <h3 className="text-base font-semibold text-white">Recent Transactions</h3>
                        </div>
                        <button
                          onClick={() => setActiveSection('transactions')}
                          className="text-white/80 hover:text-white font-medium text-sm flex items-center gap-1 cursor-pointer"
                        >
                          View all
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      {recentTransactionsAroundToday.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{transaction.category}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                              {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatTransactionDate(transaction.createdAt, 'short')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Upcoming Bills */}
                <div className="space-y-6">
                  {/* Upcoming Bills */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-500 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="text-base font-semibold text-white">Upcoming Bills</h3>
                        </div>
                        <button
                          onClick={() => setActiveSection('calendar')}
                          className="text-white/80 hover:text-white font-medium text-sm flex items-center gap-1 cursor-pointer"
                        >
                          Calendar
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      {upcomingBills.length > 0 ? (
                        upcomingBills.map((bill, idx) => (
                          <div key={bill.id || idx} className="flex items-center justify-between p-3 hover:bg-indigo-50 rounded-xl transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                                bill.daysUntilDue === 0 ? 'bg-red-100 text-red-600' :
                                bill.daysUntilDue <= 3 ? 'bg-amber-100 text-amber-600' :
                                'bg-indigo-100 text-indigo-600'
                              }`}>
                                {bill.daysUntilDue === 0 ? 'NOW' : `${bill.daysUntilDue}d`}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{bill.description}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {bill.daysUntilDue === 0 ? 'Due today' : bill.daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${bill.daysUntilDue} days`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center">
                          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 text-sm">No upcoming bills</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Section */}
          {activeSection === 'transactions' && (
            <div className="space-y-6">
              {/* Modern Header Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 px-6 py-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Transactions</h2>
                        <p className="text-slate-300 text-sm">{sortedFilteredTransactions.length} {sortedFilteredTransactions.length === 1 ? 'transaction' : 'transactions'} found</p>
                      </div>
                    </div>
                    <button
                      id="add-transaction-btn"
                      onClick={() => {
                        setEditingId(null)
                        setDescription('')
                        setAmount('')
                        setType('income')
                        setCategory('')
                        setIsRecurring(false)
                        setRemainingBalance('')
                        setInterestRate('')
                        setIsEditing(true)
                      }}
                      className="px-5 py-3 bg-white hover:bg-gray-50 text-slate-800 text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Add Transaction
                    </button>
                  </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="px-6 py-4 bg-slate-50 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-700 placeholder-slate-400"
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 text-slate-700 cursor-pointer min-w-[140px]"
                    >
                      <option value="all">All Types</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                </div>
              </div>



              {/* Transactions Table */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">APR</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedFilteredTransactions.length > 0 ? (
                        sortedFilteredTransactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center ${
                                  transaction.type === 'income' ? 'bg-green-100' : 'bg-slate-100'
                                }`}>
                                  <span className="text-[10px] font-bold uppercase text-slate-500">
                                    {formatTransactionDate(transaction.createdAt, 'month')}
                                  </span>
                                  <span className="text-sm font-bold text-slate-700 leading-none">
                                    {formatTransactionDate(transaction.createdAt, 'day')}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{transaction.description}</p>
                                {transaction.isRecurring && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Recurring
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-600">
                                {transaction.category || 'Uncategorized'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                                transaction.type === 'income'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                                }`}></span>
                                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`text-base font-bold ${
                                transaction.type === 'income' ? 'text-green-600' : 'text-slate-800'
                              }`}>
                                {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm text-slate-600">
                                {transaction.remainingBalance ? `$${transaction.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {transaction.interestRate ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-semibold">
                                  {transaction.interestRate}%
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditTransaction(transaction)}
                                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                  title="Edit"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteConfirmData({
                                      type: 'transaction',
                                      id: transaction.id,
                                      description: transaction.description,
                                      onConfirm: async () => {
                                        try {
                                          if (db) {
                                            const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
                                            const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions/${transaction.id}`)
                                            await deleteDoc(transactionRef)
                                          }
                                          setTransactions(transactions.filter(t => t.id !== transaction.id))
                                          showNotification('Transaction deleted successfully', 'success')
                                        } catch (error) {
                                          console.error('Error deleting transaction:', error)
                                          showNotification('Error deleting transaction', 'error')
                                        }
                                      }
                                    })
                                    setShowDeleteConfirmModal(true)
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-6 py-16 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                            <p className="text-lg font-semibold text-slate-700 mb-1">No transactions found</p>
                            <p className="text-sm text-slate-500">Add your first transaction to get started</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add/Edit Transaction Modal */}
              {isEditing && !selectedDay && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)' }}>
                  <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-100">
                    {/* Modern Gradient Header */}
                    <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 px-6 py-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              {editingId ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              )}
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>
                            <p className="text-slate-300 text-sm">Enter transaction details below</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIsEditing(false)
                            setEditingId(null)
                            setDescription('')
                            setAmount('')
                            setType('income')
                            setCategory('')
                            setIsRecurring(false)
                            setRemainingBalance('')
                            setInterestRate('')
                          }}
                          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                      <div className="space-y-5">
                        {/* Description */}
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                          <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Netflix Subscription"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all"
                          />
                        </div>

                        {/* Amount and Budget Row */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Amount</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                              <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Budget <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                              <input
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Type Selector */}
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setType('income')}
                              className={`px-4 py-3 rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                type === 'income'
                                  ? 'bg-green-100 text-green-700 border-2 border-green-500'
                                  : 'bg-slate-50 text-slate-600 border-2 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                              Income
                            </button>
                            <button
                              type="button"
                              onClick={() => setType('expense')}
                              className={`px-4 py-3 rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                type === 'expense'
                                  ? 'bg-red-100 text-red-700 border-2 border-red-500'
                                  : 'bg-slate-50 text-slate-600 border-2 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                              </svg>
                              Expense
                            </button>
                          </div>
                        </div>

                        {/* Category */}
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white text-slate-800 cursor-pointer transition-all"
                          >
                          <option value="">Select Category</option>
                          {type === 'income' && (
                            <>
                              <option value="Salary">Salary</option>
                              <option value="Bonus">Bonus</option>
                              <option value="Investment Income">Investment Income</option>
                              <option value="Other Income">Other Income</option>
                            </>
                          )}
                          {type === 'expense' && (
                            <>
                              <optgroup label="Housing & Utilities">
                                <option value="Rent/Mortgage">Rent/Mortgage</option>
                                <option value="Property Tax">Property Tax</option>
                                <option value="HOA Fees">HOA Fees</option>
                                <option value="Utilities">Utilities</option>
                                <option value="Internet">Internet</option>
                                <option value="Phone">Phone</option>
                                <option value="Cable">Cable</option>
                              </optgroup>
                              <optgroup label="Insurance">
                                <option value="Health Insurance">Health Insurance</option>
                                <option value="Auto Insurance">Auto Insurance</option>
                                <option value="Home Insurance">Home Insurance</option>
                                <option value="Life Insurance">Life Insurance</option>
                                <option value="Disability Insurance">Disability Insurance</option>
                              </optgroup>
                              <optgroup label="Groceries & Dining">
                                <option value="Groceries">Groceries</option>
                                <option value="Dining Out">Dining Out</option>
                                <option value="Coffee">Coffee</option>
                                <option value="Takeout">Takeout</option>
                                <option value="Restaurants">Restaurants</option>
                                <option value="Bars">Bars</option>
                              </optgroup>
                              <optgroup label="Transportation">
                                <option value="Gas">Gas</option>
                                <option value="Auto Maintenance">Auto Maintenance</option>
                                <option value="Car Wash">Car Wash</option>
                                <option value="Parking">Parking</option>
                                <option value="Tolls">Tolls</option>
                                <option value="Public Transit">Public Transit</option>
                                <option value="Rideshare">Rideshare</option>
                                <option value="Taxi">Taxi</option>
                              </optgroup>
                              <optgroup label="Subscriptions & Memberships">
                                <option value="Streaming Services">Streaming Services</option>
                                <option value="Gym Membership">Gym Membership</option>
                                <option value="Club Membership">Club Membership</option>
                                <option value="Software Subscriptions">Software Subscriptions</option>
                                <option value="Subscriptions">Subscriptions</option>
                              </optgroup>
                              <optgroup label="Personal Care & Grooming">
                                <option value="Haircut">Haircut</option>
                                <option value="Salon">Salon</option>
                                <option value="Spa">Spa</option>
                                <option value="Personal Care">Personal Care</option>
                                <option value="Clothing">Clothing</option>
                                <option value="Shoes">Shoes</option>
                                <option value="Accessories">Accessories</option>
                              </optgroup>
                              <optgroup label="Health & Medical">
                                <option value="Medical">Medical</option>
                                <option value="Dental">Dental</option>
                                <option value="Vision">Vision</option>
                                <option value="Pharmacy">Pharmacy</option>
                                <option value="Mental Health">Mental Health</option>
                              </optgroup>
                              <optgroup label="Entertainment & Hobbies">
                                <option value="Entertainment">Entertainment</option>
                                <option value="Movies">Movies</option>
                                <option value="Concerts">Concerts</option>
                                <option value="Theater">Theater</option>
                                <option value="Tickets">Tickets</option>
                                <option value="Gaming">Gaming</option>
                                <option value="Hobbies">Hobbies</option>
                                <option value="Sports">Sports</option>
                                <option value="Fitness">Fitness</option>
                              </optgroup>
                              <optgroup label="Home & Maintenance">
                                <option value="Home Maintenance">Home Maintenance</option>
                                <option value="Home Repairs">Home Repairs</option>
                                <option value="Furniture">Furniture</option>
                                <option value="Decor">Decor</option>
                                <option value="Tools">Tools</option>
                                <option value="Hardware">Hardware</option>
                                <option value="Lawn Care">Lawn Care</option>
                                <option value="Pest Control">Pest Control</option>
                                <option value="Cleaning">Cleaning</option>
                              </optgroup>
                              <optgroup label="Family & Childcare">
                                <option value="Childcare">Childcare</option>
                                <option value="Child Education">Child Education</option>
                                <option value="Child Activities">Child Activities</option>
                                <option value="Summer Camp">Summer Camp</option>
                                <option value="Tuition">Tuition</option>
                                <option value="Pet Care">Pet Care</option>
                                <option value="Veterinary">Veterinary</option>
                              </optgroup>
                              <optgroup label="Travel & Vacation">
                                <option value="Travel">Travel</option>
                                <option value="Vacation">Vacation</option>
                                <option value="Flights">Flights</option>
                                <option value="Hotels">Hotels</option>
                                <option value="Lodging">Lodging</option>
                              </optgroup>
                              <optgroup label="Shopping & Gifts">
                                <option value="Shopping">Shopping</option>
                                <option value="Gifts">Gifts</option>
                                <option value="Books">Books</option>
                                <option value="Toys">Toys</option>
                              </optgroup>
                              <optgroup label="Charitable Giving">
                                <option value="Charity">Charity</option>
                                <option value="Tithe">Tithe</option>
                                <option value="Donations">Donations</option>
                              </optgroup>
                              <optgroup label="Debt Payments">
                                <option value="Credit Card">Credit Card</option>
                                <option value="Auto Loan">Auto Loan</option>
                                <option value="Student Loan">Student Loan</option>
                                <option value="Personal Loan">Personal Loan</option>
                                <option value="Loan Payment">Loan Payment</option>
                              </optgroup>
                              <optgroup label="Other">
                                <option value="Other">Other</option>
                              </optgroup>
                            </>
                          )}
                          </select>
                        </div>

                        {/* Spending Type */}
                        {type === 'expense' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Spending Type</label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setSpendingType('fixed')}
                                className={`p-4 rounded-xl transition-all cursor-pointer text-left ${
                                  spendingType === 'fixed'
                                    ? 'bg-slate-100 border-2 border-slate-500'
                                    : 'bg-slate-50 border-2 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="font-semibold text-slate-800">Fixed</div>
                                <div className="text-xs text-slate-500 mt-0.5">Same every month</div>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSpendingType('flexible')}
                                className={`p-4 rounded-xl transition-all cursor-pointer text-left ${
                                  spendingType === 'flexible'
                                    ? 'bg-slate-100 border-2 border-slate-500'
                                    : 'bg-slate-50 border-2 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="font-semibold text-slate-800">Flexible</div>
                                <div className="text-xs text-slate-500 mt-0.5">Can be reduced</div>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Recurring and Date Row */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transaction Date</label>
                            <input
                              type="date"
                              value={transactionDate}
                              onChange={(e) => setTransactionDate(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white text-slate-800 cursor-pointer transition-all"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => setIsRecurring(!isRecurring)}
                              className={`w-full px-4 py-3 rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                isRecurring
                                  ? 'bg-slate-700 text-white'
                                  : 'bg-slate-50 text-slate-600 border-2 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              {isRecurring ? 'Recurring' : 'One-time'}
                            </button>
                          </div>
                        </div>

                        {/* Interest Rate */}
                        {shouldShowInterestRate && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Interest Rate (APR)</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={interestRate}
                                onChange={(e) => setInterestRate(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setIsEditing(false)
                            setEditingId(null)
                            setDescription('')
                            setAmount('')
                            setType('income')
                            setCategory('')
                            setIsRecurring(false)
                            setTransactionDate(new Date().toISOString().split('T')[0])
                            setRemainingBalance('')
                            setInterestRate('')
                          }}
                          className="flex-1 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!description || !amount || !type) {
                              showNotification('Please fill in required fields', 'error')
                              return
                            }
                            try {
                              const transactionData = {
                                description,
                                amount: parseFloat(amount),
                                type,
                                category,
                                spendingType: type === 'expense' ? spendingType : null,
                                budget: budget ? parseFloat(budget) : null,
                                isRecurring,
                                remainingBalance: remainingBalance ? parseFloat(remainingBalance) : null,
                                interestRate: interestRate ? parseFloat(interestRate) : 0
                              }

                              if (editingId) {
                                const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
                                const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions/${editingId}`)

                                const updateData = {
                                  ...transactionData,
                                  createdAt: transactionDate,
                                }

                                await updateDoc(transactionRef, {
                                  ...updateData,
                                  updatedAt: serverTimestamp()
                                })
                                setTransactions(transactions.map(t => t.id === editingId ? { ...t, ...updateData } : t))
                                showNotification('Transaction updated successfully', 'success')
                              } else {
                                const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
                                const transactionsRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`)

                                const createdAtValue = transactionDate

                                const docRef = await addDoc(transactionsRef, {
                                  ...transactionData,
                                  createdAt: createdAtValue,
                                })

                                setTransactions([
                                  ...transactions,
                                  { id: docRef.id, ...transactionData, createdAt: createdAtValue },
                                ])

                                showNotification('Transaction added successfully', 'success')
                              }

                              setIsEditing(false)
                              setEditingId(null)
                              setDescription('')
                              setAmount('')
                              setType('income')
                              setCategory('')
                              setSpendingType('flexible')
                              setBudget('')
                              setIsRecurring(false)
                              setTransactionDate(new Date().toISOString().split('T')[0])
                              setRemainingBalance('')
                              setInterestRate('')
                            } catch (error) {
                              console.error('Error saving transaction:', error)
                              showNotification('Error saving transaction', 'error')
                            }
                          }}
                          className="flex-1 px-6 py-3.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl cursor-pointer flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {editingId ? 'Update Transaction' : 'Add Transaction'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cash Flow Section */}
          {activeSection === 'cashflow' && (
            <div className="space-y-6">
              {/* Cashflow Chart */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Modern Header */}
                <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Cash Flow Overview</h2>
                        <p className="text-emerald-100 text-sm">Income vs Expenses by month</p>
                      </div>
                    </div>
                    {/* Year Navigation */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCashflowYear(cashflowYear - 1)}
                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="px-4 py-2 bg-white/10 rounded-xl">
                        <span className="text-lg font-bold text-white">{cashflowYear}</span>
                      </div>
                      <button
                        onClick={() => setCashflowYear(cashflowYear + 1)}
                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-8">

                {monthlyCashflowData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart
                      data={monthlyCashflowData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                      barCategoryGap="70%"
                      barGap={0}
                      stackOffset="sign"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="month"
                        stroke="#9ca3af"
                        style={{ fontSize: '12px' }}
                        tick={{ fill: '#9ca3af' }}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        style={{ fontSize: '12px' }}
                        tick={{ fill: '#9ca3af' }}
                        domain={cashflowScale.domain}
                        ticks={cashflowScale.ticks}
                        tickFormatter={(v) => {
                          if (!isFinite(v)) return '$0'
                          if (v === 0) return '$0'
                          const sign = v < 0 ? '-' : ''
                          return sign + '$' + Math.abs(v / 1000).toFixed(0) + 'K'
                        }}
                      />
                      <ReferenceLine y={0} stroke="#111827" strokeWidth={1} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value, name) => {
                          const label = name === 'income' ? 'Income' : name === 'expenseNeg' ? 'Expenses' : 'Net'
                          const num = Number(value)
                          const abs = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2 })
                          const sign = name === 'expenseNeg' ? '-' : (num < 0 ? '-' : '')
                          return [sign + '$' + abs, label]
                        }}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Bar
                        dataKey="income"
                        fill="#30a46c"
                        radius={[4, 4, 0, 0]}
                        stackId="cf"
                        barSize={12}
                      />
                      <Bar
                        dataKey="expenseNeg"
                        fill="#e5484d"
                        radius={[0, 0, 4, 4]}
                        stackId="cf"
                        barSize={12}
                      />
                      <Line type="monotone" dataKey="net" stroke="#111827" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-sm">No data available yet</p>
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Income</p>
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-600">
                    ${currentMonthStats.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </h3>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Expenses</p>
                  </div>
                  <h3 className="text-2xl font-bold text-red-500">
                    ${currentMonthStats.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </h3>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-3 h-3 rounded-full ${currentMonthStats.net < 0 ? 'bg-red-500' : 'bg-teal-500'}`}></span>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Net Savings</p>
                  </div>
                  <h3 className={`text-2xl font-bold ${currentMonthStats.net < 0 ? 'text-red-500' : 'text-teal-600'}`}>
                    {formatCurrencyWithSign(currentMonthStats.net)}
                  </h3>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-violet-500"></span>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Savings Rate</p>
                  </div>
                  <h3 className="text-2xl font-bold text-violet-600">
                    {currentMonthStats.savingsRate}%
                  </h3>
                </div>
              </div>

              {/* View Mode Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setCashflowViewMode('category')}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                    cashflowViewMode === 'category'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  By Category
                </button>
                <button
                  onClick={() => setCashflowViewMode('type')}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                    cashflowViewMode === 'type'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Fixed vs Flexible
                </button>
              </div>

              {/* Income and Expenses Breakdown - Category View */}
              {cashflowViewMode === 'category' && (
                <div className="space-y-6">
                  {/* Income Section */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <h4 className="text-base font-semibold text-white">Income</h4>
                      </div>
                      <span className="text-lg font-bold text-white">
                        ${currentMonthStats.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {budgetData.income.length > 0 ? (
                        budgetData.income
                          .sort((a, b) => b.actual - a.actual)
                          .map((item) => (
                            <div key={item.category} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  <span className="text-sm font-medium text-gray-900">{item.category}</span>
                                </div>
                                <div className="w-full bg-green-100 rounded-full h-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full transition-all"
                                    style={{
                                      width: `${currentMonthStats.income > 0 ? (item.actual / currentMonthStats.income) * 100 : 0}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <div className="ml-6 text-right">
                                <span className="text-sm font-semibold text-gray-900">
                                  ${item.actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                                <p className="text-xs text-gray-500">
                                  {currentMonthStats.income > 0 ? ((item.actual / currentMonthStats.income) * 100).toFixed(1) : 0}%
                                </p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="px-6 py-4 text-sm text-gray-500">No income recorded this month</div>
                      )}
                    </div>
                  </div>

                  {/* Expenses Section */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-rose-400 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                          </svg>
                        </div>
                        <h4 className="text-base font-semibold text-white">Expenses</h4>
                      </div>
                      <span className="text-lg font-bold text-white">
                        ${currentMonthStats.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {budgetData.expenses.length > 0 ? (
                        budgetData.expenses
                          .sort((a, b) => b.actual - a.actual)
                          .map((item) => (
                            <div key={item.category} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  <span className="text-sm font-medium text-gray-900">{item.category}</span>
                                </div>
                                <div className="w-full bg-red-100 rounded-full h-2">
                                  <div
                                    className="bg-red-500 h-2 rounded-full transition-all"
                                    style={{
                                      width: `${currentMonthStats.expenses > 0 ? (item.actual / currentMonthStats.expenses) * 100 : 0}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <div className="ml-6 text-right">
                                <span className="text-sm font-semibold text-gray-900">
                                  ${item.actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                                <p className="text-xs text-gray-500">
                                  {currentMonthStats.expenses > 0 ? ((item.actual / currentMonthStats.expenses) * 100).toFixed(1) : 0}%
                                </p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="px-6 py-4 text-sm text-gray-500">No expenses recorded this month</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Fixed vs Flexible View */}
              {cashflowViewMode === 'type' && (
                <div className="space-y-6">
                  {/* Fixed Expenses Section */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-600 to-slate-500 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <h4 className="text-base font-semibold text-white">Fixed Expenses</h4>
                      </div>
                      <span className="text-lg font-bold text-white">
                        ${spendingTypeBreakdown.fixed.reduce((sum, item) => sum + item.actual, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {spendingTypeBreakdown.fixed.length > 0 ? (
                        spendingTypeBreakdown.fixed
                          .sort((a, b) => b.actual - a.actual)
                          .map((item) => {
                            const totalFixed = spendingTypeBreakdown.fixed.reduce((sum, i) => sum + i.actual, 0)
                            return (
                              <div key={item.category} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                    <span className="text-sm font-medium text-gray-900">{item.category}</span>
                                  </div>
                                  <div className="w-full bg-teal-100 rounded-full h-2">
                                    <div
                                      className="bg-teal-500 h-2 rounded-full transition-all"
                                      style={{
                                        width: `${totalFixed > 0 ? (item.actual / totalFixed) * 100 : 0}%`
                                      }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="ml-6 text-right">
                                  <span className="text-sm font-semibold text-gray-900">
                                    ${item.actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                  <p className="text-xs text-gray-500">
                                    {totalFixed > 0 ? ((item.actual / totalFixed) * 100).toFixed(1) : 0}%
                                  </p>
                                </div>
                              </div>
                            )
                          })
                      ) : (
                        <div className="px-6 py-4 text-sm text-gray-500">No fixed expenses recorded this month</div>
                      )}
                    </div>
                  </div>

                  {/* Flexible Expenses Section */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <h4 className="text-base font-semibold text-white">Flexible Expenses</h4>
                      </div>
                      <span className="text-lg font-bold text-white">
                        ${spendingTypeBreakdown.flexible.reduce((sum, item) => sum + item.actual, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {spendingTypeBreakdown.flexible.length > 0 ? (
                        spendingTypeBreakdown.flexible
                          .sort((a, b) => b.actual - a.actual)
                          .map((item) => {
                            const totalFlexible = spendingTypeBreakdown.flexible.reduce((sum, i) => sum + i.actual, 0)
                            return (
                              <div key={item.category} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    <span className="text-sm font-medium text-gray-900">{item.category}</span>
                                  </div>
                                  <div className="w-full bg-orange-100 rounded-full h-2">
                                    <div
                                      className="bg-orange-500 h-2 rounded-full transition-all"
                                      style={{
                                        width: `${totalFlexible > 0 ? (item.actual / totalFlexible) * 100 : 0}%`
                                      }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="ml-6 text-right">
                                  <span className="text-sm font-semibold text-gray-900">
                                    ${item.actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                  <p className="text-xs text-gray-500">
                                    {totalFlexible > 0 ? ((item.actual / totalFlexible) * 100).toFixed(1) : 0}%
                                  </p>
                                </div>
                              </div>
                            )
                          })
                      ) : (
                        <div className="px-6 py-4 text-sm text-gray-500">No flexible expenses recorded this month</div>
                      )}
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Spending Type Summary</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-xs text-blue-600 font-medium mb-1">Fixed Expenses</p>
                        <p className="text-xl font-bold text-blue-700">
                          ${spendingTypeBreakdown.fixed.reduce((sum, item) => sum + item.actual, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {currentMonthStats.expenses > 0
                            ? ((spendingTypeBreakdown.fixed.reduce((sum, item) => sum + item.actual, 0) / currentMonthStats.expenses) * 100).toFixed(0)
                            : 0}% of expenses
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-xs text-orange-600 font-medium mb-1">Flexible Expenses</p>
                        <p className="text-xl font-bold text-orange-700">
                          ${spendingTypeBreakdown.flexible.reduce((sum, item) => sum + item.actual, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          {currentMonthStats.expenses > 0
                            ? ((spendingTypeBreakdown.flexible.reduce((sum, item) => sum + item.actual, 0) / currentMonthStats.expenses) * 100).toFixed(0)
                            : 0}% of expenses
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}


            </div>
          )}

          {/* Budget Section - Savings Goals */}
          {activeSection === 'budget' && (
            <div className="space-y-6">

              {/* Simple Budget Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Spending by Category Card - Left (2 columns) */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-600 via-violet-500 to-purple-500 px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Spending by Category</h3>
                        <p className="text-violet-200 text-sm">Set budgets for each category</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">

                  {/* Two columns: Fixed on left, Flexible on right */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Fixed Expenses Column */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                          <span className="text-xs font-semibold uppercase tracking-wide text-teal-600">Fixed</span>
                        </div>
                        <span className="text-xs font-medium text-gray-500">
                          {((spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)) > 0
                            ? (((spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) / ((spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0))) * 100).toFixed(0)
                            : 0}%
                        </span>
                      </div>
                      <div className="space-y-3">
                        {spendingTypeBreakdown.fixedAll
                          .sort((a, b) => b.actual - a.actual)
                          .map((item) => {
                            const budget = item.budget || 0
                            const spent = item.actual || 0
                            const remaining = Math.round((budget - spent) * 100) / 100 // Fix floating-point precision
                            const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
                            const isOverBudget = remaining < 0

                            return (
                              <div key={item.category} className="bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-base">{getCategoryEmoji(item.category)}</span>
                                  <span className="font-medium text-gray-900 text-sm truncate">{item.category}</span>
                                  {isOverBudget && (
                                    <span className="ml-auto bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                                      ${Math.abs(remaining).toLocaleString()} over
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex-1">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.01"
                                      defaultValue={budget > 0 ? budget : ''}
                                      onBlur={(e) => saveFixedBudget(item.category, Number(e.target.value || 0))}
                                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                      placeholder="Budget"
                                      className="w-full h-7 border border-gray-200 rounded-lg px-2 text-xs text-right bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </div>
                                  <div className="flex-1 text-right text-sm font-medium text-gray-900">
                                    ${spent.toLocaleString()}
                                  </div>
                                </div>
                                {budget > 0 && (
                                  <>
                                    <div className="h-1.5 bg-teal-100 rounded-full overflow-hidden mb-1">
                                      <div className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-teal-500'}`} style={{ width: `${pct}%` }}></div>
                                    </div>
                                    {!isOverBudget && (
                                      <div className="text-xs font-medium text-right text-teal-600">
                                        ${remaining.toLocaleString()} left
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    </div>

                    {/* Flexible Expenses Column */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                          <span className="text-xs font-semibold uppercase tracking-wide text-orange-700">Flexible</span>
                        </div>
                        <span className="text-xs font-medium text-gray-500">
                          {((spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)) > 0
                            ? (((spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0) / ((spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0))) * 100).toFixed(0)
                            : 0}%
                        </span>
                      </div>
                      <div className="space-y-3">
                        {spendingTypeBreakdown.flexibleAll
                          .sort((a, b) => b.actual - a.actual)
                          .map((item) => {
                            const budget = item.budget || 0
                            const spent = item.actual || 0
                            const remaining = Math.round((budget - spent) * 100) / 100 // Fix floating-point precision
                            const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
                            const isOverBudget = remaining < 0

                            return (
                              <div key={item.category} className="bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-base">{getCategoryEmoji(item.category)}</span>
                                  <span className="font-medium text-gray-900 text-sm truncate">{item.category}</span>
                                  {isOverBudget && (
                                    <span className="ml-auto bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                                      ${Math.abs(remaining).toLocaleString()} over
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex-1">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.01"
                                      defaultValue={budget > 0 ? budget : ''}
                                      onBlur={(e) => saveFlexibleBudget(item.category, Number(e.target.value || 0))}
                                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                      placeholder="Budget"
                                      className="w-full h-7 border border-gray-200 rounded-lg px-2 text-xs text-right bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </div>
                                  <div className="flex-1 text-right text-sm font-medium text-gray-900">
                                    ${spent.toLocaleString()}
                                  </div>
                                </div>
                                {budget > 0 && (
                                  <>
                                    <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden mb-1">
                                      <div className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }}></div>
                                    </div>
                                    {!isOverBudget && (
                                      <div className="text-xs font-medium text-right text-orange-600">
                                        ${remaining.toLocaleString()} left
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>

                {/* Monthly Overview Card - Right (1 column) */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-fit">
                  <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Monthly Budget</h3>
                        <p className="text-teal-100 text-sm">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">

                  {/* Income */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Income</span>
                      <span className="font-medium text-green-600">${incomeBudgetBreakdown.totalsAll.totalIncomeActualAll.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-green-100 rounded-full">
                      <div className="h-2 bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>

                  {/* Spent */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Spent</span>
                      <span className="font-medium text-red-600">
                        ${((spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-red-100 rounded-full">
                      <div
                        className="h-2 rounded-full bg-red-500"
                        style={{
                          width: `${Math.min(100, incomeBudgetBreakdown.totalsAll.totalIncomeActualAll > 0
                            ? (((spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)) / incomeBudgetBreakdown.totalsAll.totalIncomeActualAll) * 100
                            : 0)}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Remaining */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Remaining</span>
                      <span className={`text-xl font-bold ${
                        (incomeBudgetBreakdown.totalsAll.totalIncomeActualAll - (spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) - (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)) >= 0
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${Math.abs(incomeBudgetBreakdown.totalsAll.totalIncomeActualAll - (spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) - (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Savings Goals Section */}
          {activeSection === 'savings' && (
            <div className="space-y-6">
              {/* Header with Add Goal Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Savings Goals</h2>
                  <p className="text-gray-600">Create savings goals and track your progress</p>
                </div>
                <button
                  onClick={() => {
                    setShowGoalForm(!showGoalForm)
                    if (showGoalForm) {
                      setGoalName('')
                      setGoalTarget('')
                      setGoalCurrent('')
                      setGoalDeadline('')
                      setEditingGoalId(null)
                    }
                  }}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  {showGoalForm ? '✕ Cancel' : '+ Add Goal'}
                </button>
              </div>

              {/* Add/Edit Goal Form - Monarch Style */}
              {showGoalForm && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <span className="text-2xl">💰</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{editingGoalId ? 'Edit Goal' : 'Create New Savings Goal'}</h3>
                        <p className="text-amber-100 text-sm">Set aside money each month for your financial dreams</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    {/* Goal Name - Full Width */}
                    <div className="mb-6">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Goal Name</label>
                      <input
                        type="text"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        placeholder="e.g., Vacation, Christmas, Emergency Fund"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-gray-900 font-medium"
                      />
                    </div>

                    {/* Amount Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Target Amount</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">$</span>
                          <input
                            type="number"
                            value={goalTargetAmount}
                            onChange={(e) => setGoalTargetAmount(e.target.value)}
                            placeholder="5,000"
                            className="w-full bg-transparent text-2xl font-bold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Total you want to save</p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Monthly Savings</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">$</span>
                          <input
                            type="number"
                            value={goalTarget}
                            onChange={(e) => setGoalTarget(e.target.value)}
                            placeholder="500"
                            className="w-full bg-transparent text-2xl font-bold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Per month allocation</p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Already Saved</label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">$</span>
                          <input
                            type="number"
                            value={goalCurrent}
                            onChange={(e) => setGoalCurrent(e.target.value)}
                            placeholder="0"
                            className="w-full bg-transparent text-2xl font-bold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Current progress</p>
                      </div>
                    </div>

                    {/* Target Date */}
                    <div className="mb-8">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Target Date (Optional)</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="date"
                          value={goalDeadline}
                          onChange={(e) => setGoalDeadline(e.target.value)}
                          className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-gray-900"
                        />
                        {goalDeadline && goalTargetAmount && goalCurrent && goalMonthlyNeeded !== null && (
                          <div className="flex-1 bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                            <p className="text-xs text-amber-600 font-medium">
                              You'll need to save ~${goalMonthlyNeeded.toLocaleString('en-US', { maximumFractionDigits: 0 })}/month to reach your goal
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preview Card */}
                    {goalName && goalTargetAmount && (
                      <div className="mb-8 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</p>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-gray-900">{goalName}</span>
                          <span className="text-amber-600 font-bold">${parseFloat(goalTargetAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, ((parseFloat(goalCurrent) || 0) / (parseFloat(goalTargetAmount) || 1)) * 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          ${(parseFloat(goalCurrent) || 0).toLocaleString()} saved • ${((parseFloat(goalTargetAmount) || 0) - (parseFloat(goalCurrent) || 0)).toLocaleString()} to go
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <button
                        onClick={async () => {
                          if (!goalName || !goalTarget || !goalTargetAmount) {
                            showNotification('Please fill in goal name, target amount, and monthly allocation', 'error')
                            return
                          }
                          const goalData = {
                            name: goalName,
                            targetAmount: parseFloat(goalTargetAmount),
                            monthlyAllocation: parseFloat(goalTarget),
                            current: parseFloat(goalCurrent) || 0,
                            deadline: goalDeadline || null,
                            createdAt: new Date().toISOString()
                          }
                          if (editingGoalId) {
                            // Update existing goal
                            await updateSavingsGoal(editingGoalId, goalData)
                            setSavingsGoals(savingsGoals.map(g => g.id === editingGoalId ? { ...goalData, id: editingGoalId } : g))
                            showNotification('Goal updated successfully', 'success')
                          } else {
                            // Create new goal
                            const savedGoal = await saveSavingsGoal(goalData)
                            setSavingsGoals([...savingsGoals, savedGoal])
                            showNotification('Goal created successfully', 'success')
                          }
                          setGoalName('')
                          setGoalTarget('')
                          setGoalTargetAmount('')
                          setGoalCurrent('')
                          setGoalDeadline('')
                          setEditingGoalId(null)
                          setShowGoalForm(false)
                        }}
                        className="flex-1 px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <span>{editingGoalId ? '✓ Update Goal' : '+ Create Goal'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowGoalForm(false)
                          setGoalName('')
                          setGoalTarget('')
                          setGoalTargetAmount('')
                          setGoalCurrent('')
                          setGoalDeadline('')
                          setEditingGoalId(null)
                        }}
                        className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Goals Grid */}
              {savingsGoals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savingsGoals.map((goal) => {
                    const progress = (goal.current / goal.targetAmount) * 100
                    const remaining = goal.targetAmount - goal.current
                    const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
                    const isComplete = progress >= 100

                    return (
                      <div key={goal.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
                        {/* Card Header with Gradient */}
                        <div className={`px-6 pt-5 pb-4 ${isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white tracking-tight">{goal.name}</h3>
                              {isComplete && (
                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium text-white">
                                  ✓ Goal Complete!
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setGoalName(goal.name)
                                  setGoalTargetAmount(goal.targetAmount.toString())
                                  setGoalTarget(goal.monthlyAllocation.toString())
                                  setGoalCurrent(goal.current.toString())
                                  setGoalDeadline(goal.deadline || '')
                                  setEditingGoalId(goal.id)
                                  setShowGoalForm(true)
                                }}
                                className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                                title="Edit goal"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirmData({
                                    type: 'goal',
                                    id: goal.id,
                                    description: goal.name,
                                    onConfirm: async () => {
                                      await deleteSavingsGoal(goal.id)
                                      setSavingsGoals(savingsGoals.filter(g => g.id !== goal.id))
                                      showNotification('Goal deleted successfully', 'success')
                                    }
                                  })
                                  setShowDeleteConfirmModal(true)
                                }}
                                className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                                title="Delete goal"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-6">
                          {/* Target Date - Prominent Display */}
                          {daysLeft !== null && (
                            <div className={`mb-5 p-4 rounded-xl ${
                              isComplete ? 'bg-green-50 border border-green-100' :
                              daysLeft > 30 ? 'bg-amber-50 border border-amber-100' :
                              daysLeft > 0 ? 'bg-orange-50 border border-orange-100' :
                              'bg-red-50 border border-red-100'
                            }`}>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Target Date</p>
                              <p className={`text-lg font-bold ${
                                isComplete ? 'text-green-700' :
                                daysLeft > 30 ? 'text-amber-700' :
                                daysLeft > 0 ? 'text-orange-700' :
                                'text-red-700'
                              }`}>
                                {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className={`text-xs font-semibold mt-0.5 ${
                                isComplete ? 'text-green-600' :
                                daysLeft > 30 ? 'text-amber-600' :
                                daysLeft > 0 ? 'text-orange-600' :
                                'text-red-600'
                              }`}>
                                {isComplete ? 'Completed!' : daysLeft > 0 ? `${daysLeft} days remaining` : 'Deadline passed'}
                              </p>
                            </div>
                          )}

                          {/* Progress Section */}
                          <div className="mb-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-500">Progress</span>
                              <span className={`text-sm font-bold ${isComplete ? 'text-green-600' : 'text-gray-900'}`}>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isComplete ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'
                                }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Amount Info - Clean Table Style */}
                          <div className="space-y-3 mb-5">
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-500">Total Saved</span>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-gray-900">${goal.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                <button
                                  onClick={() => {
                                    setEditAmountGoalId(goal.id)
                                    setEditAmount(goal.current.toString())
                                    setShowEditAmountModal(true)
                                  }}
                                  className="text-gray-300 hover:text-amber-600 transition-colors cursor-pointer"
                                  title="Edit amount"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-500">Target Amount</span>
                              <span className="text-base font-bold text-amber-600">${goal.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-500">Monthly Allocation</span>
                              <span className="text-base font-bold text-violet-600">${goal.monthlyAllocation.toLocaleString('en-US', { minimumFractionDigits: 2 })}<span className="text-xs text-gray-400 font-normal">/mo</span></span>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-sm font-semibold text-gray-700">Still Need</span>
                              <span className={`text-xl font-bold ${remaining <= 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                {remaining <= 0 ? '✓ Complete' : `$${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                              </span>
                            </div>
                          </div>

                          {/* Add to Goal Button */}
                          <button
                            onClick={() => {
                              setAddMoneyGoalId(goal.id)
                              setAddMoneyAmount('')
                              setShowAddMoneyModal(true)
                            }}
                            className={`w-full px-4 py-3 font-semibold rounded-xl transition-all cursor-pointer ${
                              isComplete
                                ? 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200'
                            }`}
                          >
                            + Add Money
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <span className="text-4xl">💰</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No Savings Goals Yet</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">Create your first savings goal to start tracking progress toward your financial dreams</p>
                  <button
                    onClick={() => setShowGoalForm(true)}
                    className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                  >
                    + Create Your First Goal
                  </button>
                </div>
              )}

              {/* Add Money Modal - Monarch Style */}
              {showAddMoneyModal && addMoneyGoalId && addMoneyModalData && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)' }}>
                  <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <span className="text-xl">💰</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Add Money</h3>
                            <p className="text-amber-100 text-sm">{addMoneyModalData.goal.name}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowAddMoneyModal(false)
                            setAddMoneyGoalId(null)
                            setAddMoneyAmount('')
                          }}
                          className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Current Progress */}
                      <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Progress</span>
                          <span className="text-sm font-bold text-amber-600">{Math.round(addMoneyModalData.currentProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full" style={{ width: `${Math.min(addMoneyModalData.currentProgress, 100)}%` }}></div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-semibold text-gray-900">${addMoneyModalData.goal.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          <span className="text-gray-400"> of </span>
                          <span className="text-gray-600">${addMoneyModalData.goal.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </p>
                      </div>

                      {/* Amount Input */}
                      <div className="mb-6">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Amount to Add</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">$</span>
                          <input
                            type="number"
                            value={addMoneyAmount}
                            onChange={(e) => setAddMoneyAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-2xl font-bold text-gray-900 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* New Total Preview */}
                      {addMoneyAmount && !isNaN(addMoneyAmount) && parseFloat(addMoneyAmount) > 0 && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">New Total</span>
                            <span className="text-sm font-bold text-amber-600">{Math.round(addMoneyModalData.newProgress)}%</span>
                          </div>
                          <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden mb-3">
                            <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all" style={{ width: `${Math.min(addMoneyModalData.newProgress, 100)}%` }}></div>
                          </div>
                          <p className="text-2xl font-bold text-amber-700">
                            ${addMoneyModalData.newTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          {addMoneyModalData.newProgress >= 100 && (
                            <p className="text-sm font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                              <span>🎉</span> You'll reach your goal!
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={async () => {
                            if (!addMoneyAmount || isNaN(addMoneyAmount) || parseFloat(addMoneyAmount) <= 0) {
                              showNotification('Please enter a valid amount', 'error')
                              return
                            }
                            const newAmount = addMoneyModalData.goal.current + parseFloat(addMoneyAmount)
                            await updateSavingsGoal(addMoneyGoalId, { current: newAmount })
                            setSavingsGoals(savingsGoals.map(g =>
                              g.id === addMoneyGoalId ? { ...g, current: newAmount } : g
                            ))
                            showNotification(`Added $${parseFloat(addMoneyAmount).toFixed(2)} to ${addMoneyModalData.goal.name}`, 'success')
                            setShowAddMoneyModal(false)
                            setAddMoneyGoalId(null)
                            setAddMoneyAmount('')
                          }}
                          className="flex-1 px-4 py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span>+ Add Money</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowAddMoneyModal(false)
                            setAddMoneyGoalId(null)
                            setAddMoneyAmount('')
                          }}
                          className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Amount Modal - Monarch Style */}
              {showEditAmountModal && editAmountGoalId && editAmountModalData && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)' }}>
                  <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-violet-500 to-violet-600 px-6 py-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <span className="text-xl">✏️</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Edit Amount</h3>
                            <p className="text-violet-100 text-sm">{editAmountModalData.goal.name}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowEditAmountModal(false)
                            setEditAmountGoalId(null)
                            setEditAmount('')
                          }}
                          className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Goal Info */}
                      <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Target Amount</p>
                            <p className="text-xl font-bold text-gray-900">${editAmountModalData.goal.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Previous</p>
                            <p className="text-xl font-bold text-gray-400">${editAmountModalData.goal.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div className="mb-6">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">New Total Saved</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">$</span>
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white text-2xl font-bold text-gray-900 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Progress Preview */}
                      {editAmount && !isNaN(editAmount) && parseFloat(editAmount) >= 0 && (
                        <div className={`mb-6 p-4 rounded-xl border ${editAmountModalData.newProgress >= 100 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100' : 'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-100'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-xs font-semibold uppercase tracking-wide ${editAmountModalData.newProgress >= 100 ? 'text-green-700' : 'text-violet-700'}`}>New Progress</span>
                            <span className={`text-lg font-bold ${editAmountModalData.newProgress >= 100 ? 'text-green-600' : 'text-violet-600'}`}>{Math.round(editAmountModalData.newProgress)}%</span>
                          </div>
                          <div className={`w-full rounded-full h-3 overflow-hidden ${editAmountModalData.newProgress >= 100 ? 'bg-green-200' : 'bg-violet-200'}`}>
                            <div className={`h-full rounded-full transition-all ${editAmountModalData.newProgress >= 100 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-violet-400 to-purple-500'}`} style={{ width: `${Math.min(editAmountModalData.newProgress, 100)}%` }}></div>
                          </div>
                          <p className={`text-sm mt-2 ${editAmountModalData.newProgress >= 100 ? 'text-green-600' : 'text-gray-600'}`}>
                            <span className="font-semibold">${parseFloat(editAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            <span className="text-gray-400"> of </span>
                            <span>${editAmountModalData.goal.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </p>
                          {editAmountModalData.newProgress >= 100 && (
                            <p className="text-sm font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                              <span>🎉</span> Goal complete!
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={async () => {
                            if (!editAmount || isNaN(editAmount) || parseFloat(editAmount) < 0) {
                              showNotification('Please enter a valid amount', 'error')
                              return
                            }
                            await updateSavingsGoal(editAmountGoalId, { current: parseFloat(editAmount) })
                            setSavingsGoals(savingsGoals.map(g =>
                              g.id === editAmountGoalId ? { ...g, current: parseFloat(editAmount) } : g
                            ))
                            showNotification(`Updated ${editAmountModalData.goal.name} to $${parseFloat(editAmount).toFixed(2)}`, 'success')
                            setShowEditAmountModal(false)
                            setEditAmountGoalId(null)
                            setEditAmount('')
                          }}
                          className="flex-1 px-4 py-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span>✓ Save Changes</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowEditAmountModal(false)
                            setEditAmountGoalId(null)
                            setEditAmount('')
                          }}
                          className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Debt Payoff Comparison Modal */}
          {showDebtPayoffComparison && payoffComparison && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)' }}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
                {/* Header - Modern Gradient Style */}
                <div className="sticky top-0 bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 px-8 py-6 flex items-center justify-between z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Compare Payoff Strategies</h2>
                      <p className="text-teal-100 text-sm">Choose the method that works best for you</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDebtPayoffComparison(false)
                      setSelectedPayoffMethod(null)
                    }}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="p-8">
                  {/* Summary Stats - Clean Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Debt</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">${payoffComparison.totalDebt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-gray-500 mt-1">{payoffComparison.debts.length} account{payoffComparison.debts.length !== 1 ? 's' : ''}</p>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">${payoffComparison.monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-gray-500 mt-1">Min. payment</p>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Savings</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">${payoffComparison.interestSavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-gray-500 mt-1">With Avalanche</p>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{payoffComparison.timeSavings} mo</p>
                      <p className="text-xs text-gray-500 mt-1">Faster w/ Avalanche</p>
                    </div>
                  </div>

                  {/* Comparison Cards - Modern Style */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Snowball Method */}
                    <div
                      className={`rounded-2xl border-2 p-6 transition-all cursor-pointer ${
                        selectedPayoffMethod === 'snowball'
                          ? 'border-teal-500 bg-teal-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedPayoffMethod(selectedPayoffMethod === 'snowball' ? null : 'snowball')}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                            ❄️
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Snowball</h3>
                            <p className="text-sm text-gray-500">Smallest balance first</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedPayoffMethod === 'snowball' ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                        }`}>
                          {selectedPayoffMethod === 'snowball' && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-xl p-4 border border-gray-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Debt-Free</p>
                          <p className="text-lg font-bold text-gray-900">{payoffComparison.snowball.debtFreeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                          <p className="text-xs text-gray-500">{payoffComparison.snowball.totalMonths} months</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Interest</p>
                          <p className="text-lg font-bold text-orange-600">${payoffComparison.snowball.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                          <p className="text-xs text-gray-500">Total cost</p>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <p className="text-sm font-semibold text-gray-800 mb-2">Best for motivation</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Quick psychological wins
                          </li>
                          <li className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Easier to stay committed
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Avalanche Method */}
                    <div
                      className={`rounded-2xl border-2 p-6 transition-all cursor-pointer ${
                        selectedPayoffMethod === 'avalanche'
                          ? 'border-teal-500 bg-teal-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedPayoffMethod(selectedPayoffMethod === 'avalanche' ? null : 'avalanche')}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-2xl">
                            🏔️
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Avalanche</h3>
                            <p className="text-sm text-gray-500">Highest interest first</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedPayoffMethod === 'avalanche' ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                        }`}>
                          {selectedPayoffMethod === 'avalanche' && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-xl p-4 border border-gray-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Debt-Free</p>
                          <p className="text-lg font-bold text-gray-900">{payoffComparison.avalanche.debtFreeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                          <p className="text-xs text-gray-500">{payoffComparison.avalanche.totalMonths} months</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Interest</p>
                          <p className="text-lg font-bold text-orange-600">${payoffComparison.avalanche.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                          <p className="text-xs text-gray-500">Total cost</p>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                        <p className="text-sm font-semibold text-gray-800 mb-2">Best for savings</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Saves the most money
                          </li>
                          <li className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Mathematically optimal
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Your Debts - Only show when no method selected */}
                  {!selectedPayoffMethod && (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Debts</h4>
                      <div className="space-y-2">
                        {payoffComparison.debts.map((debt, index) => (
                          <div key={index} className="bg-white rounded-xl p-4 flex items-center justify-between border border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{debt.description || debt.category}</p>
                                <p className="text-sm text-gray-500">{debt.interestRate || 0}% APR</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">${debt.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation - Only show when no method selected */}
                  {!selectedPayoffMethod && (
                    <div className="bg-teal-50 rounded-xl p-5 border border-teal-100 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">Our Recommendation</p>
                          <p className="text-sm text-gray-700">
                            {payoffComparison.interestSavings > 500
                              ? `Avalanche saves $${payoffComparison.interestSavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in interest. But Snowball provides quicker wins if you need motivation.`
                              : `Both methods are similar for you. Pick based on personality: Snowball for motivation, Avalanche for max savings.`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDebtPayoffComparison(false)
                        setSelectedPayoffMethod(null)
                      }}
                      className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    {selectedPayoffMethod && (
                      <button
                        onClick={() => {
                          saveChosenPayoffMethod(selectedPayoffMethod)
                          showNotification(`You selected the ${selectedPayoffMethod === 'snowball' ? 'Snowball' : 'Avalanche'} method!`, 'success')
                          setShowDebtPayoffComparison(false)
                          setSelectedPayoffMethod(null)
                        }}
                        className="flex-1 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Choose {selectedPayoffMethod === 'snowball' ? 'Snowball' : 'Avalanche'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debt Payoff Section */}
          {activeSection === 'goals' && (
            <div className="space-y-6">
              {/* Header - Modern Gradient Style */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Debt Payoff Strategy</h2>
                        <p className="text-teal-100 text-sm">
                          {chosenPayoffMethod
                            ? `Using ${chosenPayoffMethod === 'snowball' ? 'Snowball' : 'Avalanche'} method`
                            : 'Compare methods to find your optimal payoff strategy'
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const comparison = generatePayoffComparison()
                        if (comparison) {
                          setPayoffComparison(comparison)
                          setShowDebtPayoffComparison(true)
                        } else {
                          showNotification('No debts found. Add debt transactions with interest rates to compare payoff methods.', 'error')
                        }
                      }}
                      className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-2 backdrop-blur"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {chosenPayoffMethod ? 'Change Method' : 'Compare Methods'}
                    </button>
                  </div>
                </div>
              </div>

              {/* If method is chosen, show comprehensive strategy */}
              {chosenPayoffMethod && payoffComparison ? (
                <div className="space-y-6">
                  {/* Monthly Allocation Input - Modern Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Monthly Payment Setup</h3>
                          <p className="text-sm text-gray-500">
                            Net income: <span className="font-medium text-gray-700">${(totalIncome - totalExpense).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Minimum Payments */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Minimum Payments</span>
                          <span className="text-xs text-gray-400">Required</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">${payoffComparison.monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-gray-500 mt-1">Credit cards & personal loans</p>
                      </div>

                      {/* Extra Payment Input */}
                      <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-teal-700">Extra Payment</span>
                          <button
                            onClick={() => saveDebtPayoffAllocation('0')}
                            className="text-xs text-teal-600 hover:text-teal-800 font-medium cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-2xl font-bold text-teal-700">$</span>
                          <input
                            type="number"
                            value={debtPayoffAllocation}
                            onChange={(e) => setDebtPayoffAllocation(e.target.value)}
                            onBlur={(e) => saveDebtPayoffAllocation(e.target.value)}
                            placeholder="0"
                            className="text-2xl font-bold text-teal-700 bg-transparent border-none focus:outline-none w-24 placeholder-teal-300"
                          />
                          <span className="text-sm text-teal-600">/month</span>
                        </div>
                        <p className="text-xs text-teal-600 mt-1">
                          Total: ${(payoffComparison.monthlyPayment + (parseFloat(debtPayoffAllocation) || 0)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Strategy Summary */}
                  {debtPayoffAllocation && (
                    (() => {
                      const extraAllocation = parseFloat(debtPayoffAllocation) || 0
                      const monthlyAmount = payoffComparison.monthlyPayment + extraAllocation

                      // Recalculate with custom monthly amount (minimum payments + extra allocation)
                      const customStrategy = chosenPayoffMethod === 'snowball'
                        ? calculateSnowball(payoffComparison.debts, monthlyAmount)
                        : calculateAvalanche(payoffComparison.debts, monthlyAmount)

                      return (
                        <div className="space-y-6">
                          {/* Key Metrics - Clean Modern Cards */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Debt-Free</span>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{customStrategy.debtFreeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                              <p className="text-xs text-gray-500 mt-1">{customStrategy.totalMonths} months</p>
                            </div>

                            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                  </svg>
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Interest</span>
                              </div>
                              <p className="text-2xl font-bold text-orange-600">${customStrategy.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                              <p className="text-xs text-gray-500 mt-1">Total cost</p>
                            </div>

                            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Paid</span>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">${(payoffComparison.totalDebt + customStrategy.totalInterest).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                              <p className="text-xs text-gray-500 mt-1">Principal + interest</p>
                            </div>

                            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly</span>
                              </div>
                              <p className="text-2xl font-bold text-teal-600">${monthlyAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                              <p className="text-xs text-gray-500 mt-1">Your payment</p>
                            </div>
                          </div>

                          {/* Payoff Schedule - Modern Timeline Design */}
                          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xl font-bold text-gray-900">
                                {chosenPayoffMethod === 'snowball' ? '❄️ Snowball' : '🏔️ Avalanche'} Payoff Schedule
                              </h3>
                              <span className="text-sm text-gray-500">
                                {customStrategy.payoffSchedule.filter((_, i) => paidOffDebts[customStrategy.payoffSchedule[i].id || `${customStrategy.payoffSchedule[i].description}-${i}`]).length} of {customStrategy.payoffSchedule.length} paid off
                              </span>
                            </div>

                            {/* Clarification note */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-8">
                              <p className="text-sm text-blue-700">
                                <span className="font-medium">💡 Note:</span> Payoff dates may not appear in sequential order. This is because minimum payments are applied to <em>all</em> debts simultaneously — some debts may be paid off earlier by their own minimum payments, even while extra payments are focused on the target debt.
                              </p>
                            </div>

                            {/* Timeline View */}
                            <div className="relative">
                              {customStrategy.payoffSchedule.map((debt, index) => {
                                const debtId = debt.id || `${debt.description}-${index}`
                                const isPaidOff = paidOffDebts[debtId]
                                const isLast = index === customStrategy.payoffSchedule.length - 1
                                const progressPercent = isPaidOff ? 100 : 0

                                return (
                                  <div key={index} className="relative flex gap-6 pb-8">
                                    {/* Timeline connector */}
                                    <div className="flex flex-col items-center">
                                      {/* Circle indicator */}
                                      <button
                                        onClick={() => handleMarkDebtPaidOff(debtId, debt.description || debt.category, debt.id)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all cursor-pointer z-10 ${
                                          isPaidOff
                                            ? 'bg-teal-500 text-white shadow-md'
                                            : index === 0
                                              ? 'bg-teal-100 text-teal-700 border-2 border-teal-500'
                                              : 'bg-gray-100 text-gray-500 border-2 border-gray-300'
                                        }`}
                                      >
                                        {isPaidOff ? (
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        ) : (
                                          index + 1
                                        )}
                                      </button>
                                      {/* Vertical line */}
                                      {!isLast && (
                                        <div className={`w-0.5 flex-1 mt-2 ${isPaidOff ? 'bg-teal-300' : 'bg-gray-200'}`} />
                                      )}
                                    </div>

                                    {/* Card content */}
                                    <div className={`flex-1 rounded-xl p-5 transition-all ${
                                      isPaidOff
                                        ? 'bg-teal-50 border border-teal-200'
                                        : index === 0
                                          ? 'bg-white border-2 border-teal-200 shadow-sm'
                                          : 'bg-gray-50 border border-gray-200'
                                    }`}>
                                      {/* Header */}
                                      <div className="flex items-start justify-between mb-4">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h4 className={`font-semibold text-lg ${isPaidOff ? 'text-teal-700 line-through' : 'text-gray-900'}`}>
                                              {debt.description || debt.category}
                                            </h4>
                                            {index === 0 && !isPaidOff && (
                                              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                                                Focus Now
                                              </span>
                                            )}
                                            {isPaidOff && (
                                              <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-medium rounded-full">
                                                Paid Off! 🎉
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-500 mt-0.5">
                                            {debt.interestRate || 0}% APR
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-2xl font-bold text-gray-900">
                                            ${debt.startingBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                          </p>
                                          <p className="text-xs text-gray-500">balance</p>
                                        </div>
                                      </div>

                                      {/* Progress bar */}
                                      <div className="mb-4">
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${isPaidOff ? 'bg-teal-500' : 'bg-gray-300'}`}
                                            style={{ width: `${progressPercent}%` }}
                                          />
                                        </div>
                                      </div>

                                      {/* Stats row */}
                                      <div className="grid grid-cols-3 gap-4">
                                        <div>
                                          <p className="text-xs text-gray-500 uppercase tracking-wide">Payoff Date</p>
                                          <p className="font-semibold text-gray-900 mt-0.5">
                                            {new Date(new Date().setMonth(new Date().getMonth() + debt.payoffMonth)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 uppercase tracking-wide">Interest Cost</p>
                                          <p className="font-semibold text-orange-600 mt-0.5">
                                            ${debt.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Payment</p>
                                          <p className="font-semibold text-gray-900 mt-0.5">
                                            ${debt.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Action Items - Modern Card Design */}
                          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                              </div>
                              <h3 className="text-xl font-bold text-gray-900">Your Action Plan</h3>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-start gap-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
                                <div className="w-8 h-8 rounded-lg bg-teal-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                                <div>
                                  <p className="font-semibold text-gray-900">Focus on {customStrategy.payoffSchedule[0].description || customStrategy.payoffSchedule[0].category}</p>
                                  <p className="text-sm text-gray-600 mt-0.5">Pay as much as possible toward this debt while making minimum payments on others</p>
                                </div>
                              </div>

                              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="w-8 h-8 rounded-lg bg-gray-400 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                                <div>
                                  <p className="font-semibold text-gray-900">Allocate ${extraAllocation.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month extra</p>
                                  <p className="text-sm text-gray-600 mt-0.5">Add this to the ${customStrategy.payoffSchedule[0].minPayment.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} minimum payment</p>
                                </div>
                              </div>

                              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="w-8 h-8 rounded-lg bg-gray-400 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                                <div>
                                  <p className="font-semibold text-gray-900">Stay consistent for {customStrategy.totalMonths} months</p>
                                  <p className="text-sm text-gray-600 mt-0.5">You'll be debt-free by <span className="font-medium text-teal-600">{customStrategy.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span></p>
                                </div>
                              </div>

                              <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                                <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">💰</div>
                                <div>
                                  <p className="font-semibold text-gray-900">Save ${customStrategy.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in interest</p>
                                  <p className="text-sm text-gray-600 mt-0.5">By following this plan, you'll minimize the total interest paid</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Change Method Button */}
                          <button
                            onClick={() => {
                              saveChosenPayoffMethod(null)
                              saveDebtPayoffAllocation('')
                            }}
                            className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors border border-gray-200 cursor-pointer"
                          >
                            ← Back to Compare Methods
                          </button>
                        </div>
                      )
                    })()
                  )}
                </div>
              ) : (
                /* Empty State or Comparison Button */
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4">💳</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Pay Off Your Debt?</h3>
                  <p className="text-gray-600 mb-6">Add debt transactions with interest rates to compare payoff strategies and find the best method for you.</p>
                  <button
                    onClick={() => {
                      const comparison = generatePayoffComparison()
                      if (comparison) {
                        setPayoffComparison(comparison)
                        setShowDebtPayoffComparison(true)
                      } else {
                        showNotification('No debts found. Add debt transactions with interest rates to compare payoff methods.', 'error')
                      }
                    }}
                    className="px-8 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
                  >
                    📊 Compare Payoff Methods
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Accounts Section */}
          {activeSection === 'accounts' && (
            <div className="space-y-6">
              {/* Net Worth Chart - Monarch Style */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-8 py-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                        </div>
                        <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Net Worth</p>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <h2 className="text-4xl font-bold text-white">
                          {netWorth.netWorth >= 0 ? '' : '-'}${Math.abs(netWorth.netWorth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        {/* Change indicator */}
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                          netWorth.netWorth >= 0 ? 'bg-white/20 text-white' : 'bg-amber-400/30 text-amber-100'
                        }`}>
                          {netWorth.netWorth >= 0 ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          )}
                          <span>{netWorth.netWorth >= 0 ? 'Positive' : 'In Debt'}</span>
                        </div>
                      </div>
                      <p className="text-blue-100 text-sm mt-2">
                        Assets: <span className="text-white font-medium">${netWorth.assets.toLocaleString()}</span> •
                        Liabilities: <span className="text-amber-200 font-medium">${netWorth.totalLiabilities.toLocaleString()}</span>
                      </p>
                    </div>
                    <select
                      value={liabilitiesTimeframe}
                      onChange={(e) => setLiabilitiesTimeframe(e.target.value)}
                      className="px-4 py-2 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 text-sm font-medium cursor-pointer"
                    >
                      <option value="1month" className="text-gray-900">1 month</option>
                      <option value="3months" className="text-gray-900">3 months</option>
                      <option value="6months" className="text-gray-900">6 months</option>
                      <option value="1year" className="text-gray-900">1 year</option>
                    </select>
                  </div>
                </div>
                <div className="p-8">

                {/* Net Worth Trend Chart */}
                {liabilitiesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={liabilitiesChartData.map(d => ({
                      ...d,
                      assets: netWorth.assets,
                      netWorth: netWorth.assets - d.liabilities
                    }))}>
                      <defs>
                        <linearGradient id="colorNetWorthPositive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorNetWorthNegative" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        style={{ fontSize: '12px' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        style={{ fontSize: '12px' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value, name) => {
                          const label = name === 'netWorth' ? 'Net Worth' : name === 'assets' ? 'Assets' : 'Liabilities'
                          const color = name === 'liabilities' ? '#f59e0b' : '#14b8a6'
                          return [
                            <span style={{ color }}>${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
                            label
                          ]
                        }}
                        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                      />
                      {/* Assets line */}
                      <Area
                        type="monotone"
                        dataKey="assets"
                        stroke="#14b8a6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorNetWorthPositive)"
                        name="assets"
                      />
                      {/* Liabilities line */}
                      <Area
                        type="monotone"
                        dataKey="liabilities"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorNetWorthNegative)"
                        name="liabilities"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-sm">No historical data available yet</p>
                      <p className="text-xs text-gray-400 mt-1">Data will appear as you track your finances</p>
                    </div>
                  </div>
                )}

                {/* Quick Stats Row */}
                <div className="flex gap-6 mt-6 pt-6 border-t border-gray-100">
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                      <span className="text-sm font-medium text-gray-600">Total Assets</span>
                    </div>
                    <p className="text-xl font-bold text-teal-600">${netWorth.assets.toLocaleString()}</p>
                  </div>
                  <div className="w-px bg-gray-200"></div>
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <span className="text-sm font-medium text-gray-600">Total Liabilities</span>
                    </div>
                    <p className="text-xl font-bold text-amber-600">${netWorth.totalLiabilities.toLocaleString()}</p>
                  </div>
                  <div className="w-px bg-gray-200"></div>
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className={`w-3 h-3 rounded-full ${netWorth.netWorth >= 0 ? 'bg-teal-500' : 'bg-gray-500'}`}></span>
                      <span className="text-sm font-medium text-gray-600">Net Worth</span>
                    </div>
                    <p className={`text-xl font-bold ${netWorth.netWorth >= 0 ? 'text-teal-600' : 'text-gray-900'}`}>
                      {netWorth.netWorth >= 0 ? '' : '-'}${Math.abs(netWorth.netWorth).toLocaleString()}
                    </p>
                  </div>
                </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Accounts */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Credit Cards */}
                  {accountsByType.creditCards.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <span className="text-lg">💳</span>
                          </div>
                          <h3 className="text-base font-semibold text-white">Credit Cards</h3>
                        </div>
                        <span className="text-lg font-bold text-white">
                          ${accountsByType.creditCards.reduce((sum, card) => sum + card.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {accountsByType.creditCards.map(card => (
                          <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-rose-50 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{card.name}</p>
                              <p className="text-xs text-gray-500">Credit Card</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">${card.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              {card.interestRate > 0 && (
                                <p className="text-xs text-rose-600 font-medium">{card.interestRate}% APR</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loans */}
                  {accountsByType.loans.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-400 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <span className="text-lg">🏦</span>
                          </div>
                          <h3 className="text-base font-semibold text-white">Loans</h3>
                        </div>
                        <span className="text-lg font-bold text-white">
                          ${accountsByType.loans.reduce((sum, loan) => sum + loan.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {accountsByType.loans.map(loan => (
                          <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{loan.name}</p>
                              <p className="text-xs text-gray-500">Loan</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">${loan.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              {loan.interestRate > 0 && (
                                <p className="text-xs text-blue-600 font-medium">{loan.interestRate}% APR</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto Loans */}
                  {accountsByType.autoLoans.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <span className="text-lg">🚗</span>
                          </div>
                          <h3 className="text-base font-semibold text-white">Auto Loans</h3>
                        </div>
                        <span className="text-lg font-bold text-white">
                          ${accountsByType.autoLoans.reduce((sum, loan) => sum + loan.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {accountsByType.autoLoans.map(loan => (
                          <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-amber-50 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{loan.name}</p>
                              <p className="text-xs text-gray-500">Auto Loan</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">${loan.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              {loan.interestRate > 0 && (
                                <p className="text-xs text-amber-600 font-medium">{loan.interestRate}% APR</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student Loans */}
                  {accountsByType.studentLoans.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-violet-500 to-purple-400 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <span className="text-lg">🎓</span>
                          </div>
                          <h3 className="text-base font-semibold text-white">Student Loans</h3>
                        </div>
                        <span className="text-lg font-bold text-white">
                          ${accountsByType.studentLoans.reduce((sum, loan) => sum + loan.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {accountsByType.studentLoans.map(loan => (
                          <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-violet-50 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{loan.name}</p>
                              <p className="text-xs text-gray-500">Student Loan</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">${loan.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              {loan.interestRate > 0 && (
                                <p className="text-xs text-violet-600 font-medium">{loan.interestRate}% APR</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Debts */}
                  {accountsByType.otherDebts.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-slate-600 to-slate-500 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <span className="text-lg">⚠️</span>
                          </div>
                          <h3 className="text-base font-semibold text-white">Other Debts</h3>
                        </div>
                        <span className="text-lg font-bold text-white">
                          ${accountsByType.otherDebts.reduce((sum, debt) => sum + debt.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {accountsByType.otherDebts.map(debt => (
                          <div key={debt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-slate-50 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{debt.name}</p>
                              <p className="text-xs text-gray-500">Debt</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">${debt.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              {debt.interestRate > 0 && (
                                <p className="text-xs text-red-500 font-medium">{debt.interestRate}% APR</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assets */}
                  {accountsByType.assets.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <span className="text-lg">💰</span>
                          </div>
                          <h3 className="text-base font-semibold text-white">Assets</h3>
                        </div>
                        <span className="text-lg font-bold text-white">
                          ${accountsByType.assets.reduce((sum, asset) => sum + asset.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {accountsByType.assets.map(asset => (
                          <div key={asset.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{asset.name}</p>
                              <p className="text-xs text-gray-500">Asset</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-emerald-600">${asset.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Summary */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-fit">
                  <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold text-white">Summary</h3>
                    </div>
                  </div>
                  <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
                    <div className="flex gap-6 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <span>Total</span>
                      <span>%</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Assets Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-900">Assets</span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${netWorth.assets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                      {accountsByType.assets.map(asset => (
                        <div key={asset.id} className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            {asset.name}
                          </span>
                          <span className="text-gray-900 font-medium">
                            ${asset.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Liabilities Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-900">Liabilities</span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${netWorth.totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div className="bg-amber-400 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                      {accountsByType.creditCards.length > 0 && (
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600 flex items-center gap-2">
                            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                            Credit Cards
                          </span>
                          <span className="text-gray-900 font-medium">
                            ${accountsByType.creditCards.reduce((sum, card) => sum + card.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {accountsByType.loans.length > 0 && (
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600 flex items-center gap-2">
                            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                            Loans
                          </span>
                          <span className="text-gray-900 font-medium">
                            ${accountsByType.loans.reduce((sum, loan) => sum + loan.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {accountsByType.autoLoans.length > 0 && (
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600 flex items-center gap-2">
                            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                            Auto Loans
                          </span>
                          <span className="text-gray-900 font-medium">
                            ${accountsByType.autoLoans.reduce((sum, loan) => sum + loan.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {accountsByType.studentLoans.length > 0 && (
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600 flex items-center gap-2">
                            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                            Student Loans
                          </span>
                          <span className="text-gray-900 font-medium">
                            ${accountsByType.studentLoans.reduce((sum, loan) => sum + loan.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {accountsByType.otherDebts.length > 0 && (
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600 flex items-center gap-2">
                            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                            Other Debts
                          </span>
                          <span className="text-gray-900 font-medium">
                            ${accountsByType.otherDebts.reduce((sum, debt) => sum + debt.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reports Section */}
          {activeSection === 'reports' && (
            <div className="space-y-6">
              {/* Header with Tabs */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-fuchsia-600 via-purple-500 to-violet-500 px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Reports & Analytics</h2>
                      <p className="text-purple-200 text-sm">Visualize your financial data</p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 flex gap-2 border-b border-gray-100">
                  <button
                    onClick={() => setReportsTab('cashflow')}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                      reportsTab === 'cashflow'
                        ? 'bg-fuchsia-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Cash Flow
                  </button>
                  <button
                    onClick={() => setReportsTab('spending')}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                      reportsTab === 'spending'
                        ? 'bg-fuchsia-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Spending
                  </button>
                  <button
                    onClick={() => setReportsTab('income')}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                      reportsTab === 'income'
                        ? 'bg-fuchsia-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              {/* Main Content */}
              {reportsTab === 'cashflow' && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6" style={{ height: '800px' }}>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Cash Flow Sankey</h3>
                  <ResponsiveSankey
                    data={sankeyChartData}
                    margin={{ top: 20, right: 200, bottom: 20, left: 120 }}
                    align="justify"
                    colors={{ scheme: 'category10' }}
                    nodeOpacity={1}
                    nodeHoverOpacity={1}
                    nodeThickness={18}
                    nodeInnerPadding={3}
                    nodeBorderWidth={0}
                    linkOpacity={0.35}
                    linkHoverOpacity={0.6}
                    linkContract={3}
                    enableLinkGradient={true}
                    labelPosition="outside"
                    labelPadding={16}
                    labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
                    tooltip={({ node, link }) => {
                      if (node) {
                        return (
                          <div style={{ background: '#fff', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px' }}>
                            <strong>{node.id}</strong>
                          </div>
                        );
                      }
                      if (link) {
                        return (
                          <div style={{ background: '#fff', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px' }}>
                            <strong>{link.source.id} → {link.target.id}</strong>
                            <br />
                            ${link.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </div>
              )}

              {(reportsTab === 'spending') && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left - Pie Chart */}
                  <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative" style={{ height: '450px' }}>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Spending</h3>
                    <ResponsivePie
                      data={budgetData.expenses
                        .sort((a, b) => b.actual - a.actual)
                        .slice(0, showAllCategories ? budgetData.expenses.length : 12)
                        .map((item, index) => ({
                          id: item.category,
                          label: item.category,
                          value: item.actual,
                          color: EXPENSE_COLORS[index % EXPENSE_COLORS.length]
                        }))}
                      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                      innerRadius={0.65}
                      padAngle={0}
                      cornerRadius={0}
                      colors={{ datum: 'data.color' }}
                      borderWidth={0}
                      enableArcLabels={false}
                      enableArcLinkLabels={false}
                      tooltip={({ datum }) => {
                        const total = budgetData.expenses.reduce((sum, item) => sum + item.actual, 0);
                        const percentage = ((datum.value / total) * 100).toFixed(1);
                        return (
                          <div style={{ background: '#1f2937', color: '#fff', padding: '8px 12px', border: '1px solid #374151', borderRadius: '4px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: datum.color }}></div>
                              <strong>{datum.label}</strong>
                            </div>
                            ${datum.value.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({percentage}%)
                          </div>
                        );
                      }}
                      layers={['arcs']}
                    />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 10, pointerEvents: 'none' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
                        ${currentMonthStats.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Total</div>
                    </div>
                  </div>

                  {/* Right - Category Legend */}
                  <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <div className="grid grid-cols-2 gap-4">
                      {(reportsTab === 'spending' ? budgetData.expenses : budgetData.income)
                        .sort((a, b) => b.actual - a.actual)
                        .slice(0, showAllCategories ? (reportsTab === 'spending' ? budgetData.expenses.length : budgetData.income.length) : 12)
                        .map((item, index) => (
                          <div key={item.category} className="flex items-start gap-3">
                            <div
                              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                              style={{ backgroundColor: (reportsTab === 'spending' ? EXPENSE_COLORS : INCOME_COLORS)[index % (reportsTab === 'spending' ? EXPENSE_COLORS.length : INCOME_COLORS.length)] }}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700">{item.category}</p>
                              <p className="text-sm font-semibold text-gray-900">
                                ${item.actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                    <button
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="text-sm text-fuchsia-600 hover:text-fuchsia-700 mt-4 font-medium cursor-pointer"
                    >
                      {showAllCategories ? 'Show top 12 categories' : 'View all categories'} →
                    </button>
                  </div>
                </div>
              )}

              {reportsTab === 'income' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left - Pie Chart */}
                  <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative" style={{ height: '450px' }}>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Income</h3>
                    <ResponsivePie
                      data={budgetData.income
                        .sort((a, b) => b.actual - a.actual)
                        .slice(0, showAllCategories ? budgetData.income.length : 12)
                        .map((item, index) => ({
                          id: item.category,
                          label: item.category,
                          value: item.actual,
                          color: INCOME_COLORS[index % INCOME_COLORS.length]
                        }))}
                      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                      innerRadius={0.65}
                      padAngle={0}
                      cornerRadius={0}
                      colors={{ datum: 'data.color' }}
                      borderWidth={0}
                      enableArcLabels={false}
                      enableArcLinkLabels={false}
                      tooltip={({ datum }) => {
                        const total = budgetData.income.reduce((sum, item) => sum + item.actual, 0);
                        const percentage = ((datum.value / total) * 100).toFixed(1);
                        return (
                          <div style={{ background: '#1f2937', color: '#fff', padding: '8px 12px', border: '1px solid #374151', borderRadius: '4px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: datum.color }}></div>
                              <strong>{datum.label}</strong>
                            </div>
                            ${datum.value.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({percentage}%)
                          </div>
                        );
                      }}
                      layers={['arcs']}
                    />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 10, pointerEvents: 'none' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
                        ${currentMonthStats.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Total</div>
                    </div>
                  </div>

                  {/* Right - Category Legend */}
                  <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <div className="grid grid-cols-2 gap-4">
                      {budgetData.income
                        .sort((a, b) => b.actual - a.actual)
                        .slice(0, showAllCategories ? budgetData.income.length : 12)
                        .map((item, index) => (
                          <div key={item.category} className="flex items-start gap-3">
                            <div
                              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                              style={{ backgroundColor: INCOME_COLORS[index % INCOME_COLORS.length] }}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700">{item.category}</p>
                              <p className="text-sm font-semibold text-gray-900">
                                ${item.actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                    <button
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="text-sm text-fuchsia-600 hover:text-fuchsia-700 mt-4 font-medium cursor-pointer"
                    >
                      {showAllCategories ? 'Show top 12 categories' : 'View all categories'} →
                    </button>
                  </div>
                </div>
              )}

              {/* Transactions + Summary (two columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Transactions */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Transactions</h3>
                      <div className="flex gap-2">
                        <button className="text-xs text-gray-600 hover:text-gray-900">Edit Insights</button>
                        <button className="text-xs text-gray-600 hover:text-gray-900">Sort</button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactionsSortedByDateDesc
                            .filter(transaction => {
                              // Filter based on active tab
                              if (reportsTab === 'spending') {
                                return transaction.type === 'expense'
                              } else if (reportsTab === 'income') {
                                return transaction.type === 'income'
                              }
                              // For cashflow tab, show all transactions
                              return true
                            })
                            .slice(0, 20)
                            .map((transaction) => (
                              <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 text-gray-600">
                                  {formatTransactionDate(transaction.createdAt, 'full')}
                                </td>
                                <td className="py-3 px-4 text-gray-900">{transaction.description}</td>
                                <td className="py-3 px-4 text-gray-600">{transaction.category}</td>
                                <td className={`py-3 px-4 text-right font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                  {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right: Summary */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Summary</h3>
                    <div className="divide-y divide-gray-100">
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">Total transactions</span>
                        <span className="text-sm font-medium text-gray-900">{activeReportsStats.count}</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">Largest transaction</span>
                        <span className="text-sm font-medium text-gray-900">${activeReportsStats.largest.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">Average transaction</span>
                        <span className="text-sm font-medium text-gray-900">${activeReportsStats.average.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">Total income</span>
                        <span className="text-sm font-semibold text-green-600">+${activeReportsStats.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">Total spending</span>
                        <span className="text-sm font-medium text-gray-900">${activeReportsStats.totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">First transaction</span>
                        <span className="text-sm font-medium text-gray-900">{activeReportsStats.firstDate}</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">Last transaction</span>
                        <span className="text-sm font-medium text-gray-900">{activeReportsStats.lastDate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Calendar Section */}
          {activeSection === 'calendar' && (
            <div className="space-y-6">
              {/* Calendar Header - Modern Indigo Theme */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Gradient Header Bar */}
                <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <span className="text-2xl">📅</span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h2>
                        <p className="text-indigo-100 text-sm mt-0.5">
                          {calendarHeaderStats.displayText}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all backdrop-blur cursor-pointer flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Prev
                      </button>
                      <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="px-4 py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-all cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all backdrop-blur cursor-pointer flex items-center gap-1"
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Day Headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                      <div key={day} className={`text-center font-semibold py-3 text-xs uppercase tracking-wider ${idx === 0 || idx === 6 ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {day}
                      </div>
                    ))}

                    {/* Calendar Days */}
                    {calendarData.map((day, index) => {
                      const isToday = day && day.day === todayInfo.day && currentMonth.getMonth() === todayInfo.month && currentMonth.getFullYear() === todayInfo.year
                      const hasBills = day && day.bills.length > 0

                      return (
                        <div
                          key={index}
                          onClick={() => day && setSelectedDay(day)}
                          className={`min-h-28 p-2.5 rounded-xl transition-colors cursor-pointer ${
                            day === null
                              ? 'bg-slate-50/50'
                              : isToday
                              ? 'bg-gradient-to-br from-indigo-50 to-purple-50 ring-2 ring-indigo-400 ring-offset-2 cursor-pointer hover:shadow-lg'
                              : hasBills
                              ? 'bg-slate-50 hover:bg-indigo-50 cursor-pointer hover:shadow-md border border-slate-100 hover:border-indigo-200'
                              : 'bg-white hover:bg-slate-50 cursor-pointer border border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          {day && (
                            <>
                              <div className={`flex items-center gap-1.5 mb-2`}>
                                <span className={`text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>
                                  {day.day}
                                </span>
                                {isToday && (
                                  <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                                    Today
                                  </span>
                                )}
                              </div>
                              {hasBills && (
                                <div className="space-y-1.5">
                                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-lg">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    {day.bills.length} bill{day.bills.length !== 1 ? 's' : ''}
                                  </div>
                                  <div className="text-xs font-bold text-slate-700">
                                    ${day.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div className="space-y-0.5">
                                    {day.bills.slice(0, 2).map((bill, idx) => (
                                      <div key={idx} className="text-[11px] text-slate-600 truncate">
                                        • {bill.description}
                                      </div>
                                    ))}
                                    {day.bills.length > 2 && (
                                      <div className="text-[10px] text-indigo-500 font-medium">
                                        +{day.bills.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Selected Day Modal - Bills List or Edit Form */}
              {selectedDay && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(8px)' }}>
                  <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-100">
                    {/* If editing a transaction, show edit form */}
                    {editingId && isEditing ? (
                      <>
                        {/* Edit Form Header - Indigo Gradient */}
                        <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 px-6 py-5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </div>
                            <h2 className="text-xl font-bold text-white">Edit Transaction</h2>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedDay(null)
                              setIsEditing(false)
                              setEditingId(null)
                              setDescription('')
                              setAmount('')
                              setType('income')
                              setCategory('')
                              setIsRecurring(false)
                              setTransactionDate(new Date().toISOString().split('T')[0])
                              setRemainingBalance('')
                              setInterestRate('')
                            }}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                              <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter description"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Amount</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                                <input
                                  type="number"
                                  value={amount}
                                  onChange={(e) => setAmount(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Type</label>
                              <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 cursor-pointer"
                              >
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                              <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 cursor-pointer"
                              >
                              <option value="">Select Category</option>
                              {type === 'income' && (
                                <>
                                  <option value="Salary">Salary</option>
                                  <option value="Bonus">Bonus</option>
                                  <option value="Other Income">Other Income</option>
                                </>
                              )}
                              {type === 'expense' && (
                                <>
                                  <optgroup label="Housing & Utilities">
                                    <option value="Rent/Mortgage">Rent/Mortgage</option>
                                    <option value="Property Tax">Property Tax</option>
                                    <option value="HOA Fees">HOA Fees</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Internet">Internet</option>
                                    <option value="Phone">Phone</option>
                                    <option value="Cable">Cable</option>
                                  </optgroup>
                                  <optgroup label="Insurance">
                                    <option value="Health Insurance">Health Insurance</option>
                                    <option value="Auto Insurance">Auto Insurance</option>
                                    <option value="Home Insurance">Home Insurance</option>
                                    <option value="Life Insurance">Life Insurance</option>
                                    <option value="Disability Insurance">Disability Insurance</option>
                                  </optgroup>
                                  <optgroup label="Groceries & Dining">
                                    <option value="Groceries">Groceries</option>
                                    <option value="Dining Out">Dining Out</option>
                                    <option value="Coffee">Coffee</option>
                                    <option value="Takeout">Takeout</option>
                                    <option value="Restaurants">Restaurants</option>
                                    <option value="Bars">Bars</option>
                                  </optgroup>
                                  <optgroup label="Transportation">
                                    <option value="Gas">Gas</option>
                                    <option value="Auto Maintenance">Auto Maintenance</option>
                                    <option value="Car Wash">Car Wash</option>
                                    <option value="Parking">Parking</option>
                                    <option value="Tolls">Tolls</option>
                                    <option value="Public Transit">Public Transit</option>
                                    <option value="Rideshare">Rideshare</option>
                                    <option value="Taxi">Taxi</option>
                                  </optgroup>
                                  <optgroup label="Subscriptions & Memberships">
                                    <option value="Streaming Services">Streaming Services</option>
                                    <option value="Gym Membership">Gym Membership</option>
                                    <option value="Club Membership">Club Membership</option>
                                    <option value="Software Subscriptions">Software Subscriptions</option>
                                    <option value="Subscriptions">Subscriptions</option>
                                  </optgroup>
                                  <optgroup label="Personal Care & Grooming">
                                    <option value="Haircut">Haircut</option>
                                    <option value="Salon">Salon</option>
                                    <option value="Spa">Spa</option>
                                    <option value="Personal Care">Personal Care</option>
                                    <option value="Clothing">Clothing</option>
                                    <option value="Shoes">Shoes</option>
                                    <option value="Accessories">Accessories</option>
                                  </optgroup>
                                  <optgroup label="Health & Medical">
                                    <option value="Medical">Medical</option>
                                    <option value="Dental">Dental</option>
                                    <option value="Vision">Vision</option>
                                    <option value="Pharmacy">Pharmacy</option>
                                    <option value="Mental Health">Mental Health</option>
                                  </optgroup>
                                  <optgroup label="Entertainment & Hobbies">
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Movies">Movies</option>
                                    <option value="Concerts">Concerts</option>
                                    <option value="Theater">Theater</option>
                                    <option value="Tickets">Tickets</option>
                                    <option value="Gaming">Gaming</option>
                                    <option value="Hobbies">Hobbies</option>
                                    <option value="Sports">Sports</option>
                                    <option value="Fitness">Fitness</option>
                                  </optgroup>
                                  <optgroup label="Home & Maintenance">
                                    <option value="Home Maintenance">Home Maintenance</option>
                                    <option value="Home Repairs">Home Repairs</option>
                                    <option value="Furniture">Furniture</option>
                                    <option value="Decor">Decor</option>
                                    <option value="Tools">Tools</option>
                                    <option value="Hardware">Hardware</option>
                                    <option value="Lawn Care">Lawn Care</option>
                                    <option value="Pest Control">Pest Control</option>
                                    <option value="Cleaning">Cleaning</option>
                                  </optgroup>
                                  <optgroup label="Family & Childcare">
                                    <option value="Childcare">Childcare</option>
                                    <option value="Child Education">Child Education</option>
                                    <option value="Child Activities">Child Activities</option>
                                    <option value="Summer Camp">Summer Camp</option>
                                    <option value="Tuition">Tuition</option>
                                    <option value="Pet Care">Pet Care</option>
                                    <option value="Veterinary">Veterinary</option>
                                  </optgroup>
                                  <optgroup label="Travel & Vacation">
                                    <option value="Travel">Travel</option>
                                    <option value="Vacation">Vacation</option>
                                    <option value="Flights">Flights</option>
                                    <option value="Hotels">Hotels</option>
                                    <option value="Lodging">Lodging</option>
                                  </optgroup>
                                  <optgroup label="Shopping & Gifts">
                                    <option value="Shopping">Shopping</option>
                                    <option value="Gifts">Gifts</option>
                                    <option value="Books">Books</option>
                                    <option value="Toys">Toys</option>
                                  </optgroup>
                                  <optgroup label="Charitable Giving">
                                    <option value="Charity">Charity</option>
                                    <option value="Tithe">Tithe</option>
                                    <option value="Donations">Donations</option>
                                  </optgroup>
                                  <optgroup label="Debt Payments">
                                    <option value="Credit Card">Credit Card</option>
                                    <option value="Auto Loan">Auto Loan</option>
                                    <option value="Student Loan">Student Loan</option>
                                    <option value="Personal Loan">Personal Loan</option>
                                    <option value="Loan Payment">Loan Payment</option>
                                  </optgroup>
                                  <optgroup label="Other">
                                    <option value="Other">Other</option>
                                  </optgroup>
                                </>
                              )}
                            </select>
                            </div>
                            {type === 'expense' && (
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Spending Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                  <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${spendingType === 'fixed' ? 'bg-indigo-50 border-2 border-indigo-400 ring-2 ring-indigo-100' : 'bg-slate-50 border border-slate-200 hover:border-slate-300'}`}>
                                    <input
                                      type="radio"
                                      name="spendingType"
                                      value="fixed"
                                      checked={spendingType === 'fixed'}
                                      onChange={(e) => setSpendingType(e.target.value)}
                                      className="w-4 h-4 text-indigo-600"
                                    />
                                    <div>
                                      <div className="font-semibold text-slate-800">Fixed</div>
                                      <div className="text-xs text-slate-500">Same every month</div>
                                    </div>
                                  </label>
                                  <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${spendingType === 'flexible' ? 'bg-indigo-50 border-2 border-indigo-400 ring-2 ring-indigo-100' : 'bg-slate-50 border border-slate-200 hover:border-slate-300'}`}>
                                    <input
                                      type="radio"
                                      name="spendingType"
                                      value="flexible"
                                      checked={spendingType === 'flexible'}
                                      onChange={(e) => setSpendingType(e.target.value)}
                                      className="w-4 h-4 text-indigo-600"
                                    />
                                    <div>
                                      <div className="font-semibold text-slate-800">Flexible</div>
                                      <div className="text-xs text-slate-500">Can be reduced</div>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                              <input
                                type="checkbox"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                              />
                              <div>
                                <span className="font-semibold text-slate-800">Recurring Transaction</span>
                                <p className="text-xs text-slate-500">Repeats every month</p>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Transaction Date</label>
                              <input
                                type="date"
                                value={transactionDate}
                                onChange={(e) => setTransactionDate(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Interest Rate</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={interestRate}
                                  onChange={(e) => setInterestRate(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button
                              onClick={async () => {
                                if (!description || !amount || !type) {
                                  showNotification('Please fill in required fields', 'error')
                                  return
                                }
                                try {
                                  if (editingId) {
                                    const updatedTransactionData = {
                                      description,
                                      amount: parseFloat(amount),
                                      type,
                                      category,
                                      spendingType: type === 'expense' ? spendingType : null,
                                      budget: budget ? parseFloat(budget) : null,
                                      isRecurring,
                                      remainingBalance: remainingBalance ? parseFloat(remainingBalance) : null,
                                      interestRate: interestRate ? parseFloat(interestRate) : 0
                                    }

                                    if (db) {
                                      // Update in Firebase
                                      const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
                                      const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions/${editingId}`)
                                      await updateDoc(transactionRef, {
                                        ...updatedTransactionData,
                                        updatedAt: serverTimestamp()
                                      })
                                    }

                                    // Update local state (works for both Firebase and local mode)
                                    setTransactions(transactions.map(t =>
                                      t.id === editingId
                                        ? { ...t, ...updatedTransactionData }
                                        : t
                                    ))
                                    showNotification('Transaction updated successfully', 'success')
                                  }

                                  setSelectedDay(null)
                                  setIsEditing(false)
                                  setEditingId(null)
                                  setDescription('')
                                  setAmount('')
                                  setType('income')
                                  setCategory('')
                                  setSpendingType('flexible')
                                  setBudget('')
                                  setIsRecurring(false)
                                  setRemainingBalance('')
                                  setInterestRate('')
                                } catch (error) {
                                  console.error('Error saving transaction:', error)
                                  showNotification('Error saving transaction', 'error')
                                }
                              }}
                              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Update Transaction
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDay(null)
                                setIsEditing(false)
                                setEditingId(null)
                                setDescription('')
                                setAmount('')
                                setType('income')
                                setCategory('')
                                setSpendingType('flexible')
                                setBudget('')
                                setIsRecurring(false)
                                setTransactionDate(new Date().toISOString().split('T')[0])
                                setRemainingBalance('')
                                setInterestRate('')
                              }}
                              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Bills List View - Modern Indigo Theme */}
                        <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 px-6 py-5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                              <span className="text-xl">📋</span>
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-white">
                                {selectedDay.day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()
                                  ? `Today - ${currentMonth.toLocaleDateString('en-US', { month: 'long' })} ${selectedDay.day}`
                                  : `${currentMonth.toLocaleDateString('en-US', { month: 'long' })} ${selectedDay.day}, ${currentMonth.getFullYear()}`
                                }
                              </h2>
                              <p className="text-indigo-100 text-sm">
                                {selectedDay.bills.length} bill{selectedDay.bills.length !== 1 ? 's' : ''} • ${selectedDay.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedDay(null)}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="p-6 max-h-[calc(90vh-100px)] overflow-y-auto">
                          {selectedDay.bills.length > 0 ? (
                            <div className="space-y-3">
                              {selectedDay.bills.map((billSnapshot, idx) => {
                                const bill = transactions.find(t => t.id === billSnapshot.id) || billSnapshot
                                return (
                                  <BillCheckboxItem
                                    key={bill.id || idx}
                                    bill={bill}
                                    initialPaid={paidBillsMap[bill.id] || false}
                                    onToggle={handleTogglePaid}
                                    showDate={false}
                                  />
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <span className="text-3xl">📭</span>
                              </div>
                              <p className="text-slate-500 font-medium">No bills on this day</p>
                              <p className="text-slate-400 text-sm mt-1">Enjoy your bill-free day!</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Bills List - Modern Indigo Theme */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <span className="text-xl">📋</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">All Bills This Month</h3>
                    <p className="text-slate-300 text-sm">Click to mark as paid</p>
                  </div>
                </div>
                <div className="p-6">
                  {billsThisMonth.length > 0 ? (
                    <div className="space-y-3">
                      {billsThisMonth.map((bill, idx) => (
                        <BillCheckboxItem
                          key={bill.id || idx}
                          bill={bill}
                          initialPaid={paidBillsMap[bill.id] || false}
                          onToggle={handleTogglePaid}
                          showDate={true}
                          currentMonthLabel={currentMonth.toLocaleDateString('en-US', { month: 'short' })}
                          dueDay={getBillDueDay(bill)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <span className="text-3xl">✨</span>
                      </div>
                      <p className="text-slate-600 text-lg font-medium">No bills scheduled for this month</p>
                      <p className="text-slate-400 text-sm mt-1">Add recurring transactions to see them here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}



          {/* Bills for Selected Day Modal - Temporarily disabled */}
          {false && selectedDay && (
            <div>Placeholder</div>
          )}

          {/* Category Details Modal - Temporarily disabled */}
          {false && selectedCategory && (
            <div>Placeholder</div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirmModal && deleteConfirmData && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)' }}>
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <span className="text-xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      Delete {deleteConfirmData.type === 'transaction' ? 'Transaction' : deleteConfirmData.type === 'goal' ? 'Goal' : 'Item'}?
                    </h3>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-600 mb-6">
                    {deleteConfirmData.type === 'transaction' && (
                      <>
                        Are you sure you want to delete <span className="font-semibold text-gray-900">"{deleteConfirmData.description}"</span>? This action cannot be undone.
                      </>
                    )}
                    {deleteConfirmData.type === 'goal' && (
                      <>
                        Are you sure you want to delete the goal <span className="font-semibold text-gray-900">"{deleteConfirmData.description}"</span>? This action cannot be undone.
                      </>
                    )}
                    {deleteConfirmData.type === 'reset' && (
                      <>
                        Are you sure you want to reset for a new month? This will delete <span className="font-semibold text-gray-900">{deleteConfirmData.count} non-recurring transaction(s)</span> and keep all recurring transactions. This action cannot be undone.
                      </>
                    )}
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirmModal(false)
                        setDeleteConfirmData(null)
                      }}
                      className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await deleteConfirmData.onConfirm()
                          setShowDeleteConfirmModal(false)
                          setDeleteConfirmData(null)
                        } catch (error) {
                          console.error('Error during delete:', error)
                          showNotification('Error deleting item', 'error')
                        }
                      }}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debt Paid Off Celebration Modal */}
          {showDebtPaidOffModal && (
            <DebtPaidOffModal
              debtName={celebratingDebtName}
              onClose={() => setShowDebtPaidOffModal(false)}
            />
          )}

          {/* Complete Profile Modal - shown when user has no name set */}
          {showCompleteProfileModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                  <div className="flex items-center justify-center">
                    <img src="/keel-logo.png" alt="Keel" className="w-16 h-16" />
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Keel! 👋</h2>
                    <p className="text-gray-500 text-sm">Let's personalize your experience. What's your name?</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={profileNameInput}
                      onChange={(e) => setProfileNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveProfileName()}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
                      placeholder="Enter your name"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={handleSaveProfileName}
                    disabled={profileSaving || !profileNameInput.trim()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profileSaving ? 'Saving...' : 'Continue →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* My Account Modal */}
          {showAccountModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Account
                    </h2>
                    <button
                      onClick={() => setShowAccountModal(false)}
                      className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5">
                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      placeholder="Your name"
                    />
                  </div>

                  {/* Email Field (read-only for now - changing email requires re-authentication) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={accountEmail}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                      placeholder="Your email"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Email cannot be changed here. Contact support if you need to update your email.
                    </p>
                  </div>

                  {/* Account Info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Account Information</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="text-gray-500">Member since:</span>{' '}
                        {userProfile?.createdAt?.toDate ?
                          userProfile.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) :
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Subscription Info */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Subscription</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {isLifetimeFree ? 'Lifetime Free' : isSubscribed ? 'Keel Pro' : 'No active subscription'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isLifetimeFree ? 'Friends & Family plan' : isSubscribed ? '$4.99/month' : 'Subscribe for full access'}
                        </p>
                      </div>
                      {!isLifetimeFree && isSubscribed && (
                        <button
                          onClick={handleManageSubscription}
                          disabled={portalLoading}
                          className="px-4 py-2 text-sm bg-white border border-purple-200 text-purple-600 font-medium rounded-lg hover:bg-purple-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {portalLoading ? 'Loading...' : 'Manage'}
                        </button>
                      )}
                    </div>
                    {portalLoading && (
                      <p className="text-xs text-purple-500 mt-2 animate-pulse">
                        Opening subscription portal... This may take a few seconds.
                      </p>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => setShowAccountModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAccountChanges}
                    disabled={accountSaving}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {accountSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
