import { ResponsivePie } from '@nivo/pie'
import { ResponsiveSankey } from '@nivo/sankey'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, getDocs, setDoc } from 'firebase/firestore'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Line, ReferenceLine } from 'recharts'
import DebtPaidOffModal from './DebtPaidOffModal.jsx'

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
  db,
  handleLogout,
  firebaseStatus,
  firebaseError,
  monthResetNotification,
  setMonthResetNotification
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

  const [showUnbudgetedFixed, setShowUnbudgetedFixed] = useState(false)
  const [showUnbudgetedFlexible, setShowUnbudgetedFlexible] = useState(false)
  const [showUnbudgetedIncome, setShowUnbudgetedIncome] = useState(false)
  const [fixedBudgetInput, setFixedBudgetInput] = useState('')
  const [flexibleBudgetInput, setFlexibleBudgetInput] = useState('')
  const [flexibleBudgetEdits, setFlexibleBudgetEdits] = useState({}) // { [category]: number|string }
  const [fixedBudgetEdits, setFixedBudgetEdits] = useState({}) // { [category]: number|string }
  const [incomeBudgetEdits, setIncomeBudgetEdits] = useState({}) // { [category]: number|string }

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



  // Load paid-off debts from localStorage on mount
  useEffect(() => {
    const savedPaidOffDebts = localStorage.getItem('paidOffDebts')
    if (savedPaidOffDebts) {
      try {
        setPaidOffDebts(JSON.parse(savedPaidOffDebts))
      } catch (error) {
        console.error('Error loading paid-off debts:', error)
      }
    }
  }, [])

  // Save paid-off debts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('paidOffDebts', JSON.stringify(paidOffDebts))
  }, [paidOffDebts])

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Handle marking a debt as paid off
  const handleMarkDebtPaidOff = (debtId, debtName) => {
    const newPaidOffState = !paidOffDebts[debtId]
    setPaidOffDebts(prev => ({
      ...prev,
      [debtId]: newPaidOffState
    }))

    if (newPaidOffState) {
      // Show celebration modal with confetti
      setCelebratingDebtName(debtName)
      setShowDebtPaidOffModal(true)
    }
  }

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

  // Liabilities chart data based on timeframe
  const liabilitiesChartData = useMemo(() => {
    const today = new Date()
    let daysBack = 5 // Default for 1 month view (last 5 days)

    if (liabilitiesTimeframe === '3months') {
      daysBack = 30
    } else if (liabilitiesTimeframe === '6months') {
      daysBack = 60
    } else if (liabilitiesTimeframe === '1year') {
      daysBack = 120
    }

    const chartData = []
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      chartData.push({
        date: dateLabel,
        liabilities: netWorth.totalLiabilities
      })
    }
    return chartData
  }, [liabilitiesTimeframe, netWorth.totalLiabilities])

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
  const generatePayoffComparison = () => {
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
  }


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



  const handleCancelEdit = () => {
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
  }

  const handleDeleteTransaction = async (transactionId) => {
    if (!userId) return

    try {
      if (db) {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, transactionId)
        await deleteDoc(transactionRef)
      } else {
        const updated = transactions.filter(t => t.id !== transactionId)
        setTransactions(updated)
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
    }
  }

  // Save to localStorage
  const handleSaveToLocal = () => {
    try {
      localStorage.setItem('finance-tracker-transactions', JSON.stringify(transactions))
      showNotification(`Saved ${transactions.length} transactions to local storage!`, 'success')
    } catch (error) {
      console.error('Error saving to localStorage:', error)
      showNotification('Error saving data!', 'error')
    }
  }

  // Load from localStorage
  const handleLoadFromLocal = () => {
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
  }

  // Export to JSON file
  const handleExportToFile = () => {
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
  }

  // Import from JSON file
  const handleImportFromFile = async (event) => {
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
  }

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
  }, [transactions])

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

  // Check if a bill is paid this month
  const isBillPaidThisMonth = (transaction) => {
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
  }

  // Toggle paid status for a bill
  const handleTogglePaid = async (transactionId) => {
    if (!userId || !transactionId) return

    // Ensure transactionId is a string
    const id = String(transactionId)

    const transaction = transactions.find(t => String(t.id) === id)
    if (!transaction) {
      showNotification('Transaction not found', 'error')
      return
    }

    const isPaid = isBillPaidThisMonth(transaction)
    const newPaidDate = isPaid ? null : Date.now()

    // Optimistic update - update UI immediately
    setTransactions(transactions.map(t =>
      String(t.id) === id ? { ...t, paidDate: newPaidDate } : t
    ))

    try {
      if (db) {
        const appId = window.__app_id || import.meta.env.VITE_APP_ID || 'finance-tracker-app'
        const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, id)
        await updateDoc(transactionRef, { paidDate: newPaidDate })
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
      // Revert optimistic update on error
      setTransactions(transactions.map(t =>
        String(t.id) === id ? { ...t, paidDate: transaction.paidDate } : t
      ))
      showNotification('Error updating payment status', 'error')
    }
  }

  // Reset all bills for new month
  const handleResetAllBills = async () => {
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
	            setTransactions(transactions.filter(t => t.isRecurring))
	          }
          showNotification('Month reset successfully! Recurring transactions kept.', 'success')
        } catch (error) {
          console.error('Error resetting month:', error)
          showNotification('Error resetting month', 'error')
        }
      }
    })
    setShowDeleteConfirmModal(true)
  }

  // Handle debt balance update
  const handleUpdateDebtBalance = async () => {
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
	        const updatedTransactions = transactions.map(t => {
	          if (t.type === 'expense' && t.remainingBalance > 0) {
	            const proportion = (t.remainingBalance || 0) / currentTotalDebt
	            const newBalance = Math.max(0, (t.remainingBalance || 0) + (difference * proportion))
	            return { ...t, remainingBalance: newBalance }
	          }
	          return t
	        })
	        setTransactions(updatedTransactions)
	      }
      setShowDebtModal(false)
      setDebtModalValue('')
    } catch (error) {
      console.error('Error updating debt balance:', error)
      showNotification('Error updating debt balance', 'error')
    }
  }



  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-6 fixed h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Finance Tracker</h2>
        <nav className="space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'accounts', label: 'Accounts', icon: '🏦' },
            { id: 'transactions', label: 'Transactions', icon: '💳' },
            { id: 'cashflow', label: 'Cash Flow', icon: '💰' },
            { id: 'reports', label: 'Reports', icon: '📈' },
            { id: 'budget', label: 'Budget', icon: '💼' },
            { id: 'calendar', label: 'Calendar', icon: '📅' },
            { id: 'goals', label: 'Debt Payoff', icon: '🎯' },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 font-medium ${activeSection === section.id ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-200'}`}
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
                  {activeSection === 'calendar' && 'Calendar'}
                  {activeSection === 'goals' && 'Debt Payoff'}
                </h1>
                <p className="text-gray-600">
                  {activeSection === 'dashboard' && 'Track your income and expenses with ease'}
                  {activeSection === 'cashflow' && 'Visualize your money flow from income to expenses'}
                  {activeSection !== 'dashboard' && activeSection !== 'cashflow' && 'Manage your finances'}
                </p>
                <p className="text-sm text-gray-500 mt-2">Logged in as: {user?.email}</p>
                {firebaseStatus && (
                  <p className={`text-sm mt-2 flex items-center gap-2 ${
                    firebaseStatus === 'connected' ? 'text-green-600' :
                    firebaseStatus === 'error' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      firebaseStatus === 'connected' ? 'bg-green-600' :
                      firebaseStatus === 'error' ? 'bg-red-600' :
                      'bg-yellow-600'
                    }`}></span>
                    {firebaseStatus === 'connected' && 'Firebase: Connected'}
                    {firebaseStatus === 'connecting' && 'Firebase: Connecting...'}
                    {firebaseStatus === 'error' && `Firebase: Error - ${firebaseError || 'Connection failed'}`}
                  </p>
                )}
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Dashboard Section */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome Message */}
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Good morning, Antonio! 👋</h1>
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
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Transactions</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Most recent</span>
                        <button
                          onClick={() => setActiveSection('transactions')}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          All transactions →
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {recentTransactionsAroundToday.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            <p className="text-xs text-gray-500 mt-1">{transaction.category}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(() => { const d = getCreatedAtDate(transaction.createdAt); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-' })()}
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
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Upcoming Bills</h3>
                      <button
                        onClick={() => setActiveSection('calendar')}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        View calendar →
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(() => {
                        const today = new Date()
                        const currentDay = today.getDate()

                        const upcomingBills = transactions
                          .filter(t => t.isRecurring && t.createdAt)
                          .map(bill => {
                            // Extract day from createdAt
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

                        return upcomingBills.length > 0 ? (
                          upcomingBills.map((bill, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-b-0">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{bill.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {(() => {
                                    let dueDay
                                    if (typeof bill.createdAt === 'string') {
                                      const [, , day] = bill.createdAt.split('-')
                                      dueDay = parseInt(day)
                                    } else if (typeof bill.createdAt === 'number') {
                                      const date = new Date(bill.createdAt)
                                      dueDay = date.getDate()
                                    }
                                    return `${bill.daysUntilDue === 0 ? 'Today' : bill.daysUntilDue === 1 ? 'Tomorrow' : `In ${bill.daysUntilDue} days`} (the ${dueDay}${['st', 'nd', 'rd'][((dueDay - 1) % 10)] || 'th'})`
                                  })()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                  ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm text-center py-4">No upcoming bills</p>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Section */}
          {activeSection === 'transactions' && (
            <div className="space-y-6">
              {/* Header with Add Button */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="debt">Debt</option>
                    <option value="asset">Asset</option>
                  </select>
                </div>
                <button
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
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                >
                  + Add Transaction
                </button>
              </div>



              {/* Transactions Table */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Description</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Category</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Amount</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Balance</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">APR</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
	                    <tbody className="divide-y divide-gray-200">
	                      {sortedFilteredTransactions.length > 0 ? (
	                        sortedFilteredTransactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {(() => {
                                // Handle both date strings (YYYY-MM-DD) and timestamps
                                if (typeof transaction.createdAt === 'string') {
                                  const [year, month, day] = transaction.createdAt.split('-')
	                                  return new Date(year, parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
	                                    month: '2-digit',
	                                    day: '2-digit',
	                                    year: 'numeric',
	                                  })
                                } else {
	                                  return new Date(transaction.createdAt).toLocaleDateString('en-US', {
	                                    month: '2-digit',
	                                    day: '2-digit',
	                                    year: 'numeric',
	                                  })
                                }
                              })()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{transaction.description}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{transaction.category || '-'}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                transaction.type === 'income' ? 'bg-green-100 text-green-800' :
                                transaction.type === 'expense' ? 'bg-red-100 text-red-800' :
                                transaction.type === 'debt' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {transaction.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                              ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600">
                              {transaction.remainingBalance ? `$${transaction.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600">
                              {transaction.interestRate ? `${transaction.interestRate}%` : '-'}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    handleEditTransaction(transaction)
                                  }}
                                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
                                >
                                  Edit
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
                                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                            No transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add/Edit Transaction Modal */}
              {isEditing && !selectedDay && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(4px)' }}>
                  <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Edit Transaction' : 'Add New Transaction'}</h2>
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
                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                      >
                        ×
                      </button>
                    </div>

                    <div className="p-6">
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Description"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Amount"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          placeholder="Budget (Optional)"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        {type === 'expense' && (
                          <div className="px-4 py-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Spending Type</label>
                            <div className="space-y-2">
                              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{borderColor: spendingType === 'fixed' ? '#3b82f6' : '#d1d5db', backgroundColor: spendingType === 'fixed' ? '#eff6ff' : 'white'}}>
                                <input
                                  type="radio"
                                  name="spendingType"
                                  value="fixed"
                                  checked={spendingType === 'fixed'}
                                  onChange={(e) => setSpendingType(e.target.value)}
                                  className="w-4 h-4"
                                />
                                <div>
                                  <div className="font-medium">Fixed</div>
                                  <div className="text-xs text-gray-600">Same every month, hard to reduce</div>
                                </div>
                              </label>
                              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{borderColor: spendingType === 'flexible' ? '#3b82f6' : '#d1d5db', backgroundColor: spendingType === 'flexible' ? '#eff6ff' : 'white'}}>
                                <input
                                  type="radio"
                                  name="spendingType"
                                  value="flexible"
                                  checked={spendingType === 'flexible'}
                                  onChange={(e) => setSpendingType(e.target.value)}
                                  className="w-4 h-4"
                                />
                                <div>
                                  <div className="font-medium">Flexible</div>
                                  <div className="text-xs text-gray-600">Changes monthly, can be reduced</div>
                                </div>
                              </label>
                            </div>
                          </div>
                        )}
                        <label className="flex items-center gap-2 px-4 py-2">
                          <input
                            type="checkbox"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span>Recurring</span>
                        </label>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Date</label>
                          <input
                            type="date"
                            value={transactionDate}
	                            onChange={(e) => {
	                              setTransactionDate(e.target.value)
	                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {shouldShowInterestRate && (
                          <input
                            type="number"
                            value={interestRate}
                            onChange={(e) => setInterestRate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Interest Rate (%)"
                            step="0.01"
                          />
                        )}
                      </div>

                      <div className="flex gap-4 mt-6">
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

                                // Always store the selected transaction date for both
                                // recurring and non-recurring transactions
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

                                // Always use the selected transaction date for createdAt to
                                // avoid timezone issues and keep a single date field
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
                          className="flex-1 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                        >
                          {editingId ? 'Update Transaction' : 'Add Transaction'}
                        </button>
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
                          className="flex-1 px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors"
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

          {/* Cash Flow Section */}
          {activeSection === 'cashflow' && (
            <div className="space-y-6">
              {/* Cashflow Chart */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                {/* Year Navigation */}
                <div className="flex items-center justify-center gap-8 mb-8">
                  <button
                    onClick={() => setCashflowYear(cashflowYear - 1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <span>←</span>
                    <span className="text-sm font-medium">{cashflowYear - 1}</span>
                  </button>

                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900">{cashflowYear}</h2>
                  </div>

                  <button
                    onClick={() => setCashflowYear(cashflowYear + 1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <span className="text-sm font-medium">{cashflowYear + 1}</span>
                    <span>→</span>
                  </button>
                </div>

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
                    No data available yet
                  </div>
                )}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-xs font-medium mb-1">INCOME</p>
                  <h3 className="text-2xl font-bold text-green-600">
                    ${currentMonthStats.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </h3>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-xs font-medium mb-1">EXPENSES</p>
                  <h3 className="text-2xl font-bold text-red-600">
                    ${currentMonthStats.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </h3>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-xs font-medium mb-1">TOTAL SAVINGS</p>
                  <h3 className={`text-2xl font-bold ${currentMonthStats.net < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {(() => {
                      const net = currentMonthStats.net || 0
                      const abs = Math.abs(net).toLocaleString('en-US', { minimumFractionDigits: 2 })
                      const sign = net < 0 ? '-' : ''
                      return sign + '$' + abs
                    })()}
                  </h3>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-xs font-medium mb-1">SAVINGS RATE</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {currentMonthStats.savingsRate}%
                  </h3>
                </div>
              </div>

              {/* Income and Expenses Breakdown */}
              <div className="space-y-6">
                {/* Income Section */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Income</h4>
                    <div className="flex gap-6 text-xs font-medium text-gray-600">
                      <span>Category</span>
                      <span>Group</span>
                      <span>Merchant</span>
                      <span>Share</span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {budgetData.income.length > 0 ? (
                      budgetData.income.map((item) => (
                        <div key={item.category} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-gray-900">● {item.category}</span>
                            </div>
                            <div className="w-full bg-green-100 rounded-full h-3">
                              <div
                                className="bg-green-500 h-3 rounded-full"
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
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-6 py-4 text-sm text-gray-500">No income recorded this month</div>
                    )}
                  </div>
                </div>

                {/* Expenses Section */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Expenses</h4>
                    <div className="flex gap-6 text-xs font-medium text-gray-600">
                      <span>Category</span>
                      <span>Group</span>
                      <span>Merchant</span>
                      <span>Share</span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {budgetData.expenses.length > 0 ? (
                      budgetData.expenses.map((item) => (
                        <div key={item.category} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-gray-900">● {item.category}</span>
                            </div>
                            <div className="w-full bg-red-100 rounded-full h-3">
                              <div
                                className="bg-red-500 h-3 rounded-full"
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
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-6 py-4 text-sm text-gray-500">No expenses recorded this month</div>
                    )}
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* Budget Section - Savings Goals */}
          {activeSection === 'budget' && (
            <div className="space-y-6">

              {/* Fixed vs Flexible Expenses Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                {/* Column headers */}
                <div className="px-6 py-3 border-b border-gray-200 flex items-center bg-gray-50">
                  <div className="w-1/3"></div>
                  <div className="w-2/3 grid grid-cols-3 gap-0 text-right">
                    <div className="text-xs font-medium text-gray-600">Budget</div>
                    <div className="text-xs font-medium text-gray-600">Actual</div>
                    <div className="text-xs font-medium text-gray-600">Remaining</div>
                  </div>
                </div>

                {/* Income */}
                <div className="border-b border-gray-200">
                  <div className="relative">
                    <div className="w-full px-6 py-3 flex items-center hover:bg-gray-50 transition-colors">
                      <div
                        onClick={() => setExpandedSpendingTypes({ ...expandedSpendingTypes, income: !expandedSpendingTypes.income })}
                        className="flex items-center gap-3 w-1/3 cursor-pointer"
                      >
                        <span className={`text-gray-600 font-medium text-lg transition-transform inline-block ${expandedSpendingTypes.income ? 'rotate-90' : ''}`}>&gt;</span>
                        <h3 className="text-sm font-medium text-gray-900">Income</h3>
                      </div>
                      <div className="w-2/3 grid grid-cols-3 gap-0 text-right items-center">
                        {/* Budget total */}
                        <div className="text-sm text-gray-900">
                          ${incomeBudgetBreakdown.totalsAll.totalIncomeBudgetAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        {/* Actual total */}
                        <div className="text-sm text-gray-900">
                          ${incomeBudgetBreakdown.totalsAll.totalIncomeActualAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        {/* Remaining pill */}
                        <div className="text-sm">
                          {(() => { const rem = (incomeBudgetBreakdown.totalsAll.totalIncomeBudgetAll || 0) - (incomeBudgetBreakdown.totalsAll.totalIncomeActualAll || 0); const negative = rem < 0; return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${negative ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                              {negative ? '-' : ''}${Math.abs(rem).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </span>
                          )})()}
                        </div>
                      </div>
                    </div>
                    <div className={`${(incomeBudgetBreakdown.totalsAll.totalIncomeBudgetAll - incomeBudgetBreakdown.totalsAll.totalIncomeActualAll) < 0 ? 'bg-red-400' : 'bg-green-400'}`} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '3px' }} />
                  </div>

                  {/* Income Details */}
                  {expandedSpendingTypes.income && (
                    <div className="divide-y divide-gray-200 bg-gray-50">
                      {(showUnbudgetedIncome ? incomeBudgetBreakdown.incomeAll : incomeBudgetBreakdown.income).length > 0 ? (
                        (showUnbudgetedIncome ? incomeBudgetBreakdown.incomeAll : incomeBudgetBreakdown.income).map((item) => {
                          const hasBudget = (item.budget || 0) > 0
                          const remaining = (item.budget || 0) - (item.actual || 0)
                          const remainingColor = remaining < 0 ? 'text-red-600' : 'text-green-600'
                          const budgetValue = incomeBudgetEdits[item.category] ?? (hasBudget ? item.budget : '')
                          return (
                            <div key={item.category} className="px-6 py-2 flex items-center hover:bg-gray-100 transition-colors">
                              <span className="text-xs text-gray-700 w-1/3 flex items-center gap-2">
                                <span className="text-sm">{getCategoryEmoji(item.category)}</span>
                                <span>{item.category}</span>
                              </span>
                              <div className="w-2/3 grid grid-cols-3 gap-0 text-right items-center">
                                {/* Budget input */}
                                <div className="text-xs text-gray-600 flex justify-end">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    value={budgetValue}
                                    onChange={(e) => setIncomeBudgetEdits(prev => ({ ...prev, [item.category]: e.target.value }))}
                                    onBlur={(e) => saveIncomeBudget(item.category, Number(e.target.value || 0))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                    placeholder="0"
                                    className="w-24 h-8 border border-gray-300 rounded-md px-3 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                                {/* Actual */}
                                <span className="text-xs text-gray-900">
                                  ${item.actual.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                </span>
                                {/* Remaining */}
                                <span className={`text-xs ${hasBudget ? remainingColor : 'text-gray-400'}`}>
                                  {hasBudget ? `${remaining < 0 ? '-' : ''}$${Math.abs(remaining).toLocaleString('en-US', { minimumFractionDigits: 0 })}` : ''}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="px-6 py-3 text-center text-gray-500 text-xs">No income this month</div>
                      )}

                      {/* Show/Collapse unbudgeted - empty right side */}
                      <div
                        onClick={() => setShowUnbudgetedIncome(!showUnbudgetedIncome)}
                        className="px-6 py-3 flex items-center hover:bg-gray-50 transition-colors cursor-pointer border-t border-gray-200"
                      >
                        <div className="flex items-center gap-2 w-full text-sm text-gray-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{(() => { const list = (incomeBudgetBreakdown.incomeAll || []).filter(i => (i.budget || 0) <= 0); return showUnbudgetedIncome ? 'Collapse unbudgeted' : `Show ${list.length} unbudgeted`; })()}</span>
                        </div>
                      </div>

                      {/* Total Income */}
                      <div className="px-6 py-3 flex items-center bg-white border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900 w-1/3">Total Income</h3>
                        <div className="w-2/3 grid grid-cols-3 gap-0 text-right">
                          <div className="text-sm font-semibold text-gray-900">${incomeBudgetBreakdown.totalsAll.totalIncomeBudgetAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                          <div className="text-sm font-semibold text-gray-900">${incomeBudgetBreakdown.totalsAll.totalIncomeActualAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                          <div className={`text-sm font-semibold ${((incomeBudgetBreakdown.totalsAll.totalIncomeBudgetAll - incomeBudgetBreakdown.totalsAll.totalIncomeActualAll) < 0) ? 'text-red-600' : 'text-gray-900'}`}>
                            ${(() => { const rem = (incomeBudgetBreakdown.totalsAll.totalIncomeBudgetAll - incomeBudgetBreakdown.totalsAll.totalIncomeActualAll); return rem.toLocaleString('en-US', { minimumFractionDigits: 2 }) })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Expenses Section */}
                <div className="border-b border-gray-200">
                  <div className="relative">
                    <div className="w-full px-6 py-3 flex items-center hover:bg-gray-50 transition-colors">
                      <div
                        onClick={() => setExpandedSpendingTypes({ ...expandedSpendingTypes, expenses: !expandedSpendingTypes.expenses })}
                        className="flex items-center gap-3 w-1/3 cursor-pointer"
                      >
                        <span className={`text-gray-600 font-medium text-lg transition-transform inline-block ${expandedSpendingTypes.expenses ? 'rotate-90' : ''}`}>&gt;</span>
                        <h3 className="text-sm font-medium text-gray-900">Expenses</h3>
                      </div>
                      <div className="w-2/3 grid grid-cols-3 gap-0 text-right items-center">
                        <div className="text-sm text-gray-900">
                          ${(() => {
                            const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                            const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                            return (fixedBudget + flexBucketBudget).toLocaleString('en-US', { minimumFractionDigits: 2 })
                          })()}
                        </div>
                        <div className="text-sm text-gray-900">
                          ${(() => {
                            const actual = (spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)
                            return actual.toLocaleString('en-US', { minimumFractionDigits: 2 })
                          })()}
                        </div>
                        <div className="text-sm">
                          {(() => {
                            const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                            const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                            const budgetedExpenses = fixedBudget + flexBucketBudget
                            const actual = (spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)
                            const rem = budgetedExpenses - actual
                            const negative = rem < 0
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${negative ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {negative ? '-' : ''}${Math.abs(rem).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className={`${(((spendingTypeBreakdown.totalFixedBudget || 0) + (parseFloat(flexibleBudgetInput || 0) || 0)) - ((spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0))) < 0 ? 'bg-red-400' : 'bg-green-400'}`} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '3px' }} />
                  </div>
                </div>

                {expandedSpendingTypes.expenses && (
                <>

                {/* Fixed Expenses */}
                <div className="border-b border-gray-200">
                  <div className="relative">
                    <div className="w-full px-6 py-3 flex items-center hover:bg-gray-50 transition-colors">
                      <div
                        onClick={() => setExpandedSpendingTypes({...expandedSpendingTypes, fixed: !expandedSpendingTypes.fixed})}
                        className="flex items-center gap-3 w-1/3 cursor-pointer"
                      >
                        <span className={`text-gray-600 font-medium text-lg transition-transform inline-block ${expandedSpendingTypes.fixed ? 'rotate-90' : ''}`}>&gt;</span>
                        <h3 className="text-sm font-medium text-gray-900">Fixed</h3>
                      </div>
                      <div className="w-2/3 grid grid-cols-3 gap-0 text-right items-center">
                        <div className="text-sm text-gray-900">${spendingTypeBreakdown.totalsAll.totalFixedBudgetAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <div className="text-sm text-gray-900">${spendingTypeBreakdown.totalsAll.totalFixedActualAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <div className="text-sm">
                          {(() => {
                            const rem = spendingTypeBreakdown.totalsAll.totalFixedBudgetAll - spendingTypeBreakdown.totalsAll.totalFixedActualAll
                            const negative = rem < 0
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${negative ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {negative ? '-' : ''}${Math.abs(rem).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className={`${(spendingTypeBreakdown.totalsAll.totalFixedBudgetAll - spendingTypeBreakdown.totalsAll.totalFixedActualAll) < 0 ? 'bg-red-400' : 'bg-green-400'}`} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '3px' }} />
                  </div>


                  {/* Fixed Expenses Details */}
                  {expandedSpendingTypes.fixed && (
                    <div className="divide-y divide-gray-200 bg-gray-50">
                      {(showUnbudgetedFixed ? spendingTypeBreakdown.fixedAll : spendingTypeBreakdown.fixed).length > 0 ? (
                        (showUnbudgetedFixed ? spendingTypeBreakdown.fixedAll : spendingTypeBreakdown.fixed).map((item) => {
                          const remaining = item.budget - item.actual
                          const remainingColor = remaining < 0 ? 'text-red-600' : 'text-green-600'
                          return (
                            <div key={item.category} className="px-6 py-2 flex items-center hover:bg-gray-100 transition-colors">
                              <span className="text-xs text-gray-700 w-1/3 flex items-center gap-2"><span className="text-sm">{getCategoryEmoji(item.category)}</span><span>{item.category}</span></span>
                              <div className="w-2/3 grid grid-cols-3 gap-0 text-right items-center">
                                <div className="text-xs text-gray-600 flex justify-end">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    value={fixedBudgetEdits[item.category] ?? ((item.budget || 0) > 0 ? item.budget : '')}
                                    onChange={(e)=> setFixedBudgetEdits(prev=>({ ...prev, [item.category]: e.target.value }))}
                                    onBlur={(e)=> saveFixedBudget(item.category, Number(e.target.value || 0))}
                                    onKeyDown={(e)=>{ if (e.key==='Enter') e.currentTarget.blur() }}
                                    placeholder="0"
                                    className="w-24 h-8 border border-gray-300 rounded-md px-3 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                                <span className="text-xs text-gray-900">${item.actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                <span className={`text-xs ${remainingColor}`}>${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="px-6 py-3 text-center text-gray-500 text-xs">No fixed expenses this month</div>
                      )}
                      {/* Show unbudgeted toggle at bottom of Fixed */}
                      <div
                        onClick={() => setShowUnbudgetedFixed(!showUnbudgetedFixed)}
                        className="px-6 py-3 flex items-center hover:bg-gray-50 transition-colors cursor-pointer border-t border-gray-200"
                      >
                        <div className="flex items-center gap-2 w-full text-sm text-gray-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{(() => { const list = (spendingTypeBreakdown.fixedAll || []).filter(i => (i.budget || 0) <= 0); return showUnbudgetedFixed ? 'Collapse unbudgeted' : `Show ${list.length} unbudgeted`; })()}</span>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* Flexible Expenses */}
                <div className="border-b border-gray-200">
                  <div className="relative">
                    <div className="w-full px-6 py-3 flex items-center hover:bg-gray-50 transition-colors">
                      <div
                        onClick={() => setExpandedSpendingTypes({...expandedSpendingTypes, flexible: !expandedSpendingTypes.flexible})}
                        className="flex items-center gap-3 w-1/3 cursor-pointer"
                      >
                        <span className={`text-gray-600 font-medium text-lg transition-transform inline-block ${expandedSpendingTypes.flexible ? 'rotate-90' : ''}`}>&gt;</span>
                        <h3 className="text-sm font-medium text-gray-900">Flexible</h3>
                      </div>
                      <div className="w-2/3 grid grid-cols-3 gap-0 text-right items-center">
                        <div className="text-sm text-gray-900 flex justify-end">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            value={flexibleBudgetInput}
                            onChange={(e) => setFlexibleBudgetInput(e.target.value)}
                            placeholder="$0"
                            className="w-24 h-8 border border-gray-300 rounded-md px-3 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <div className="text-sm text-gray-900">${spendingTypeBreakdown.totalsAll.totalFlexibleActualAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <div className="text-sm">
                          {(() => {
                            const headerBudget = parseFloat(flexibleBudgetInput || 0) || 0
                            const rem = headerBudget - spendingTypeBreakdown.totalsAll.totalFlexibleActualAll
                            const negative = rem < 0
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${negative ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {negative ? '-' : ''}${Math.abs(rem).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className={`${(spendingTypeBreakdown.totalsAll.totalFlexibleBudgetAll - spendingTypeBreakdown.totalsAll.totalFlexibleActualAll) < 0 ? 'bg-red-400' : 'bg-green-400'}`} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '3px' }} />
                  </div>

                  {/* Unallocated Flexible Budget row (based on header input minus category budgets) */}
                  <div className="px-6 py-3 flex items-center">
                    <div className="w-1/3 flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-gray-400">○</span>
                      <span className="text-gray-600 italic">Unallocated Flexible Budget</span>
                    </div>
                    <div className="w-2/3 grid grid-cols-3 gap-0 text-right items-center">
                      <div />
                      <div className="text-sm">
                        {(() => {
                          const totalCatBudgets = spendingTypeBreakdown.totalsAll.totalFlexibleBudgetAll
                          const headerBudget = parseFloat(flexibleBudgetInput || 0) || 0
                          const unallocated = headerBudget - totalCatBudgets
                          const negative = unallocated < 0
                          return (
                            <span className={negative ? 'text-red-600' : 'text-gray-500'}>
                              {negative ? '-' : ''}${Math.abs(unallocated).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </span>
                          )
                        })()}
                      </div>
                      <div />
                    </div>
                  </div>

                  {/* Flexible Expenses Details */}
                  {expandedSpendingTypes.flexible && (
                    <div className="bg-gray-50">
                      {(showUnbudgetedFlexible ? spendingTypeBreakdown.flexibleAll : spendingTypeBreakdown.flexible).length > 0 ? (
                        (showUnbudgetedFlexible ? spendingTypeBreakdown.flexibleAll : spendingTypeBreakdown.flexible).map((item) => {
                          const remaining = item.budget - item.actual
                          const hasBudget = item.budget > 0
                          const remainingColor = remaining < 0 ? 'text-red-600' : 'text-green-600'
                          const budgetValue = flexibleBudgetEdits[item.category] ?? (hasBudget ? item.budget : '')
                          return (
                            <div key={item.category} className="relative">
                              <div className="px-6 py-2 flex items-center hover:bg-gray-100 transition-colors">
                                <span className="text-xs text-gray-700 w-1/3 flex items-center gap-2">
                                  <span className="text-sm">{getCategoryEmoji(item.category)}</span>
                                  <span>{item.category}</span>
                                </span>
                                <div className="w-2/3 grid grid-cols-3 gap-0 text-right items-center">
                                  <div className="text-xs text-gray-600 flex justify-end">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.01"
                                      value={budgetValue}
                                      onChange={(e) => setFlexibleBudgetEdits(prev => ({ ...prev, [item.category]: e.target.value }))}
                                      onBlur={(e) => {
                                        const v = e.target.value
                                        const num = Number(v || 0)
                                        saveFlexibleBudget(item.category, num)
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur()
                                        }
                                      }}
                                      placeholder="0"
                                      className="w-24 h-8 border border-gray-300 rounded-md px-3 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </div>
                                  <span className="text-xs text-gray-900">${item.actual.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                                  <span className={`text-xs ${remainingColor}`}>{hasBudget ? `${remaining < 0 ? '-' : ''}$${Math.abs(remaining).toLocaleString('en-US', { minimumFractionDigits: 0 })}` : ''}</span>
                                </div>
                              </div>
                              {hasBudget && remaining < 0 && (
                                <div className="bg-red-400" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '3px' }} />
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="px-6 py-3 text-center text-gray-500 text-xs">No flexible expenses this month</div>
                      )}

                      {/* Show unbudgeted toggle at bottom of Flexible */}
                      <div
                        onClick={() => setShowUnbudgetedFlexible(!showUnbudgetedFlexible)}
                        className="px-6 py-3 flex items-center hover:bg-gray-50 transition-colors cursor-pointer border-t border-gray-200"
                      >
                        <div className="flex items-center gap-2 w-full text-sm text-gray-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{(() => { const list = (spendingTypeBreakdown.flexibleAll || []).filter(i => (i.budget || 0) <= 0); return showUnbudgetedFlexible ? 'Collapse unbudgeted' : `Show ${list.length} unbudgeted` })()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Expenses */}
                <div className="px-6 py-3 border-t border-gray-200 flex items-center">
                  <h3 className="text-sm font-medium text-gray-900 w-1/3">Total Expenses</h3>
                  <div className="w-2/3 grid grid-cols-3 gap-0 text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      ${(() => {
                        const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                        const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                        return (fixedBudget + flexBucketBudget).toLocaleString('en-US', { minimumFractionDigits: 2 })
                      })()}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      ${(() => {
                        const actual = ((spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0))
                        return (actual).toLocaleString('en-US', { minimumFractionDigits: 2 })
                      })()}
                    </div>
                    <div className={`text-sm font-semibold ${(() => {
                      const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                      const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                      const budget = fixedBudget + flexBucketBudget
                      const actual = ((spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0))
                      return actual > budget ? 'text-red-600' : 'text-gray-900'
                    })()}`}>
                      ${(() => {
                        const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                        const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                        const budget = fixedBudget + flexBucketBudget
                        const actual = ((spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0))
                        return (budget - actual).toLocaleString('en-US', { minimumFractionDigits: 2 })
                      })()}
                    </div>
                  </div>
                </div>
                </>
                )}


                {/* Left-to-Budget bottom banner */}
                {(() => {
                  const now = new Date()
                  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                  let totalIncomeActual = 0
                  transactions.forEach(t => {
                    const d = getCreatedAtDate(t.createdAt)
                    if (!d) return
                    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                    if (mk === monthKey && t.type === 'income') totalIncomeActual += (t.amount || 0)
                  })
                  const incomeBudgetSum = Object.values(budgetsIncome || {}).reduce((s, n) => s + (n || 0), 0)
                  const budgetedIncome = incomeBudgetSum > 0 ? incomeBudgetSum : totalIncomeActual
                  const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                  const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                  const budgetedExpenses = fixedBudget + flexBucketBudget
                  const left = budgetedIncome - budgetedExpenses
                  const bg = left < 0 ? '#e5484d' : '#30a46c' // Monarch red-9 / green-9
                  return (
                    <div className="px-6 py-3 flex items-center justify-between text-white" style={{ backgroundColor: bg }}>
                      <div className="text-sm font-medium">Left to Budget</div>
                      <div className="text-sm font-semibold">{`${left < 0 ? '-' : ''}$${Math.abs(left).toLocaleString('en-US', { minimumFractionDigits: 0 })}`}</div>
                    </div>
                  )
                })()}

              </div>

                {/* Right Column: Summary, Income, Expenses */}
                <div className="space-y-4">
                  {/* Unified Right Column: Summary | Income | Expenses (tabbed) */}
                  <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                    {/* Top green panel */}
                    <div className="px-6 pt-5 pb-4 bg-white">
                      <div className="rounded-xl bg-green-100 px-6 py-5 text-center">
                        <div className="text-3xl font-semibold text-green-700">
                          ${(() => {
                            const now = new Date()
                            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                            let totalIncomeActual = 0
                            transactions.forEach(t => {
                              const d = getCreatedAtDate(t.createdAt)
                              if (!d) return
                              const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                              if (mk === monthKey && t.type === 'income') totalIncomeActual += (t.amount || 0)
                            })
                            const incomeBudgetSum = Object.values(budgetsIncome || {}).reduce((s, n) => s + (n || 0), 0)
                            const budgetedIncome = incomeBudgetSum > 0 ? incomeBudgetSum : totalIncomeActual
                            const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                            const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                            const budgetedExpenses = fixedBudget + flexBucketBudget
                            const left = budgetedIncome - budgetedExpenses
                            return Math.abs(left).toLocaleString('en-US', { minimumFractionDigits: 0 })
                          })()}
                        </div>
                        <div className="text-sm text-green-700">Left to budget
                          <span className="ml-1 align-middle text-green-700">ℹ️</span>
                        </div>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="px-6 pb-3 -mt-1 flex items-center justify-center gap-3">
                      <button onClick={() => setRightPanelTab('summary')} className={`px-4 py-1 rounded-full text-sm ${rightPanelTab==='summary' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Summary</button>
                      <button onClick={() => setRightPanelTab('income')} className={`px-4 py-1 rounded-full text-sm ${rightPanelTab==='income' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Income</button>
                      <button onClick={() => setRightPanelTab('expenses')} className={`px-4 py-1 rounded-full text-sm ${rightPanelTab==='expenses' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Expenses</button>
                    </div>

                    {/* Tab content */}
                    <div className="border-t">
                      {rightPanelTab === 'summary' && (
                        <>
                          {/* Income section (summary) */}
                          <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between text-sm">
                              <div className="text-gray-900 font-medium">Income</div>
                              <div className="text-gray-500">
                                ${(() => {
                                  const incomeBudgetSum = Object.values(budgetsIncome || {}).reduce((s, n) => s + (n || 0), 0)
                                  return (incomeBudgetSum > 0 ? incomeBudgetSum : 0).toLocaleString('en-US', { minimumFractionDigits: 0 })
                                })()} budget
                              </div>
                            </div>
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: `${(() => {
                                const now = new Date()
                                const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                                let actual = 0
                                transactions.forEach(t => {
                                  const d = getCreatedAtDate(t.createdAt)
                                  if (!d) return
                                  const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                  if (mk === monthKey && t.type === 'income') actual += (t.amount || 0)
                                })
                                const budget = Object.values(budgetsIncome || {}).reduce((s, n) => s + (n || 0), 0)
                                const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0
                                return pct
                              })()}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-sm">
                              <div className="text-gray-900">${(() => {
                                const now = new Date()
                                const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                                let actual = 0
                                transactions.forEach(t => {
                                  const d = getCreatedAtDate(t.createdAt)
                                  if (!d) return
                                  const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                  if (mk === monthKey && t.type === 'income') actual += (t.amount || 0)
                                })
                                return actual.toLocaleString('en-US', { minimumFractionDigits: 0 })
                              })()} earned</div>
                              <div className={`font-medium ${(() => {
                                const now = new Date()
                                const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                                let actual = 0
                                transactions.forEach(t => {
                                  const d = getCreatedAtDate(t.createdAt)
                                  if (!d) return
                                  const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                  if (mk === monthKey && t.type === 'income') actual += (t.amount || 0)
                                })
                                const budget = Object.values(budgetsIncome || {}).reduce((s, n) => s + (n || 0), 0)
                                return (budget - actual) < 0 ? 'text-red-600' : 'text-green-600'
                              })()}`}>
                                ${(() => {
                                  const now = new Date()
                                  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                                  let actual = 0
                                  transactions.forEach(t => {
                                    const d = getCreatedAtDate(t.createdAt)
                                    if (!d) return
                                    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                    if (mk === monthKey && t.type === 'income') actual += (t.amount || 0)
                                  })
                                  const budget = Object.values(budgetsIncome || {}).reduce((s, n) => s + (n || 0), 0)
                                  return Math.abs(budget - actual).toLocaleString('en-US', { minimumFractionDigits: 0 })
                                })()} remaining
                              </div>
                            </div>
                          </div>

                          {/* Expenses section (summary) */}
                          <div className="px-6 py-4">
                            <div className="flex items-center justify-between text-sm">
                              <div className="text-gray-900 font-medium">Expenses</div>
                              <div className="text-gray-500">
                                ${(() => {
                                  const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                                  const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                                  return (fixedBudget + flexBucketBudget).toLocaleString('en-US', { minimumFractionDigits: 0 })
                                })()} budget
                              </div>
                            </div>
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full ${(() => {
                                const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                                const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                                const budget = fixedBudget + flexBucketBudget
                                const actual = (spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)
                                return actual > budget ? 'bg-red-500' : 'bg-green-500'
                              })()}" style={{ width: `${(() => {
                                const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                                const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                                const budget = fixedBudget + flexBucketBudget
                                const actual = (spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)
                                const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0
                                return pct
                              })()}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-sm">
                              <div className="text-gray-900">${(() => {
                                const actual = (spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)
                                return actual.toLocaleString('en-US', { minimumFractionDigits: 0 })
                              })()} spent</div>
                              <div className={`font-medium ${(() => {
                                const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                                const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                                const budget = fixedBudget + flexBucketBudget
                                const actual = (spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)
                                return (budget - actual) < 0 ? 'text-red-600' : 'text-green-600'
                              })()}`}>
                                ${(() => {
                                  const fixedBudget = spendingTypeBreakdown.totalFixedBudget || 0
                                  const flexBucketBudget = parseFloat(flexibleBudgetInput || 0) || 0
                                  const budget = fixedBudget + flexBucketBudget
                                  const actual = (spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0) + (spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0)
                                  return Math.abs(budget - actual).toLocaleString('en-US', { minimumFractionDigits: 0 })
                                })()} remaining
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {rightPanelTab === 'income' && (
                        <div className="px-6 py-4">
                          <div className="flex items-center justify-between text-sm">
                            <div className="text-gray-900 font-medium">Income</div>
                            <div className="text-gray-500">
                              ${(() => {
                                const incomeBudgetSum = Object.values(budgetsIncome || {}).reduce((s, n) => s + (n || 0), 0)
                                return (incomeBudgetSum > 0 ? incomeBudgetSum : 0).toLocaleString('en-US', { minimumFractionDigits: 0 })
                              })()} budget
                            </div>
                          </div>
                          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${(() => {
                              const now = new Date()
                              const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                              let actual = 0
                              transactions.forEach(t => {
                                const d = getCreatedAtDate(t.createdAt)
                                if (!d) return
                                const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                if (mk === monthKey && t.type === 'income') actual += (t.amount || 0)
                              })
                              const budget = Object.values(budgetsIncome || {}).reduce((s, n) => s + (n || 0), 0)
                              const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0
                              return pct
                            })()}%` }} />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <div className="text-gray-900">${(() => {
                              const now = new Date()
                              const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                              let actual = 0
                              transactions.forEach(t => {
                                const d = getCreatedAtDate(t.createdAt)
                                if (!d) return
                                const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                if (mk === monthKey && t.type === 'income') actual += (t.amount || 0)
                              })
                              return actual.toLocaleString('en-US', { minimumFractionDigits: 0 })
                            })()} earned</div>
                            <div className={`font-medium ${(() => {
                              const now = new Date()
                              const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                              let actual = 0
                              transactions.forEach(t => {
                                const d = getCreatedAtDate(t.createdAt)
                                if (!d) return
                                const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                if (mk === monthKey && t.type === 'income') actual += (t.amount || 0)
                              })
                              const budget = Object.values(budgetsIncome || {}).reduce((s, n) => s + (n || 0), 0)
                              return (budget - actual) < 0 ? 'text-red-600' : 'text-green-600'
                            })()}`}>
                              ${(() => {
                                const now = new Date()
                                const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                                let actual = 0
                                transactions.forEach(t => {
                                  const d = getCreatedAtDate(t.createdAt)
                                  if (!d) return
                                  const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                  if (mk === monthKey && t.type === 'income') actual += (t.amount || 0)
                                })
                                const budget = Object.values(budgetsIncome || {}).reduce((s, n) => s + (n || 0), 0)
                                return Math.abs(budget - actual).toLocaleString('en-US', { minimumFractionDigits: 0 })
                              })()} remaining
                            </div>
                          </div>
                        </div>
                      )}

                      {rightPanelTab === 'expenses' && (
                        <div className="px-6 py-4 space-y-6">
                          {/* Fixed */}
                          <div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="text-gray-900 font-medium">Fixed</div>
                              <div className="text-gray-500">${(spendingTypeBreakdown.totalFixedBudget || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })} budget</div>
                            </div>
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full ${(() => {
                                const budget = spendingTypeBreakdown.totalFixedBudget || 0
                                const actual = spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0
                                return actual > budget ? 'bg-red-500' : 'bg-green-500'
                              })()}" style={{ width: `${(() => {
                                const budget = spendingTypeBreakdown.totalFixedBudget || 0
                                const actual = spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0
                                const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0
                                return pct
                              })()}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-sm">
                              <div className="text-gray-900">${(spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })} spent</div>
                              <div className={`font-medium ${(() => {
                                const budget = spendingTypeBreakdown.totalFixedBudget || 0
                                const actual = spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0
                                return (budget - actual) < 0 ? 'text-red-600' : 'text-green-600'
                              })()}`}>
                                ${(() => {
                                  const budget = spendingTypeBreakdown.totalFixedBudget || 0
                                  const actual = spendingTypeBreakdown.totalsAll.totalFixedActualAll || 0
                                  return Math.abs(budget - actual).toLocaleString('en-US', { minimumFractionDigits: 0 })
                                })()} remaining
                              </div>
                            </div>
                          </div>

                          {/* Flexible */}
                          <div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="text-gray-900 font-medium">Flexible</div>
                              <div className="text-gray-500">${(parseFloat(flexibleBudgetInput || 0) || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })} budget</div>
                            </div>
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400" style={{ width: `${(() => {
                                const budget = parseFloat(flexibleBudgetInput || 0) || 0
                                const actual = spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0
                                const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0
                                return pct
                              })()}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-sm">
                              <div className="text-gray-900">${(spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })} spent</div>
                              <div className={`font-medium ${(() => {
                                const budget = parseFloat(flexibleBudgetInput || 0) || 0
                                const actual = spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0
                                return (budget - actual) < 0 ? 'text-red-600' : 'text-green-600'
                              })()}`}>
                                ${(() => {
                                  const budget = parseFloat(flexibleBudgetInput || 0) || 0
                                  const actual = spendingTypeBreakdown.totalsAll.totalFlexibleActualAll || 0
                                  return Math.abs(budget - actual).toLocaleString('en-US', { minimumFractionDigits: 0 })
                                })()} remaining
                              </div>
                            </div>
                          </div>

                          {/* Non-Monthly (placeholder if not present) */}
                          <div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="text-gray-900 font-medium">Non-Monthly</div>
                              <div className="text-gray-500">$0 budget</div>
                            </div>
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: '0%' }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-sm">
                              <div className="text-gray-900">$0 spent</div>
                              <div className="font-medium text-green-600">$0 remaining</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
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
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-lg"
                >
                  {showGoalForm ? '✕ Cancel' : '+ Add Goal'}
                </button>
              </div>

              {/* Add/Edit Goal Form */}
              {showGoalForm && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{editingGoalId ? 'Edit Goal' : 'Create New Savings Goal'}</h3>
                  <p className="text-gray-600 mb-6">Set aside money each month for your savings goals</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Goal Name</label>
                      <input
                        type="text"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        placeholder="e.g., Vacation, Christmas, Emergency Fund"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target Amount ($)</label>
                      <input
                        type="number"
                        value={goalTargetAmount}
                        onChange={(e) => setGoalTargetAmount(e.target.value)}
                        placeholder="5000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Total amount you want to save</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Allocation ($)</label>
                      <input
                        type="number"
                        value={goalTarget}
                        onChange={(e) => setGoalTarget(e.target.value)}
                        placeholder="500"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">How much per month to save for this goal?</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Amount Saved ($)</label>
                      <input
                        type="number"
                        value={goalCurrent}
                        onChange={(e) => setGoalCurrent(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target Date (Optional)</label>
                      <input
                        type="date"
                        value={goalDeadline}
                        onChange={(e) => setGoalDeadline(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">When do you want to reach this goal?</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={() => {
                        if (!goalName || !goalTarget || !goalTargetAmount) {
                          showNotification('Please fill in goal name, target amount, and monthly allocation', 'error')
                          return
                        }
                        const newGoal = {
                          id: editingGoalId || Date.now().toString(),
                          name: goalName,
                          targetAmount: parseFloat(goalTargetAmount),
                          monthlyAllocation: parseFloat(goalTarget),
                          current: parseFloat(goalCurrent) || 0,
                          deadline: goalDeadline || null,
                          createdAt: new Date().toISOString()
                        }
                        if (editingGoalId) {
                          setSavingsGoals(savingsGoals.map(g => g.id === editingGoalId ? newGoal : g))
                          showNotification('Goal updated successfully', 'success')
                        } else {
                          setSavingsGoals([...savingsGoals, newGoal])
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
                      className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                    >
                      {editingGoalId ? 'Update Goal' : 'Create Goal'}
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
                      className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
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

                    return (
                      <div key={goal.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{goal.name}</h3>
                          </div>
                          <div className="flex gap-2">
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
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit goal"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirmData({
                                  type: 'goal',
                                  id: goal.id,
                                  description: goal.name,
                                  onConfirm: async () => {
                                    setSavingsGoals(savingsGoals.filter(g => g.id !== goal.id))
                                    showNotification('Goal deleted successfully', 'success')
                                  }
                                })
                                setShowDeleteConfirmModal(true)
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete goal"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Target Date - Prominent Display */}
                        {daysLeft !== null && (
                          <div className={`mb-4 p-3 rounded-lg ${daysLeft > 30 ? 'bg-green-50 border border-green-200' : daysLeft > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                            <p className="text-xs font-medium text-gray-600 mb-1">TARGET DATE</p>
                            <p className={`text-sm font-bold ${daysLeft > 30 ? 'text-green-700' : daysLeft > 0 ? 'text-yellow-700' : 'text-red-700'}`}>
                              {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className={`text-xs font-medium mt-1 ${daysLeft > 30 ? 'text-green-600' : daysLeft > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {daysLeft > 0 ? `${daysLeft} days remaining` : 'Deadline passed'}
                            </p>
                          </div>
                        )}

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Progress</span>
                            <span className="text-sm font-bold text-gray-900">{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Amount Info */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Total Saved</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">${goal.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              <button
                                onClick={() => {
                                  setEditAmountGoalId(goal.id)
                                  setEditAmount(goal.current.toString())
                                  setShowEditAmountModal(true)
                                }}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit amount"
                              >
                                ✎
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Target Amount</span>
                            <span className="font-bold text-blue-600">${goal.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Monthly Allocation</span>
                            <span className="font-bold text-purple-600">${goal.monthlyAllocation.toLocaleString('en-US', { minimumFractionDigits: 2 })}/mo</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <span className="text-gray-600 font-medium">Still Need</span>
                            <span className={`font-bold text-lg ${remaining <= 0 ? 'text-green-600' : 'text-gray-900'}`}>
                              ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                          className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg transition-colors"
                        >
                          + Add Money
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No Savings Goals Yet</h3>
                  <p className="text-gray-600 mb-6">Create your first savings goal to start tracking progress toward your financial dreams</p>
                  <button
                    onClick={() => setShowGoalForm(true)}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Create Your First Goal
                  </button>
                </div>
              )}

              {/* Add Money Modal */}
              {showAddMoneyModal && addMoneyGoalId && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(4px)' }}>
                  <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md w-full">
                    {(() => {
                      const goal = savingsGoals.find(g => g.id === addMoneyGoalId)
                      return (
                        <>
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">Add Money</h3>
                            <button
                              onClick={() => {
                                setShowAddMoneyModal(false)
                                setAddMoneyGoalId(null)
                                setAddMoneyAmount('')
                              }}
                              className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="mb-6">
                            <p className="text-gray-600 mb-2">Goal: <span className="font-bold text-gray-900">{goal?.name}</span></p>
                            <p className="text-sm text-gray-500">Current: ${goal?.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>

                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Add ($)</label>
                            <input
                              type="number"
                              value={addMoneyAmount}
                              onChange={(e) => setAddMoneyAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                              autoFocus
                            />
                          </div>

                          {addMoneyAmount && !isNaN(addMoneyAmount) && (
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm text-gray-600 mb-1">New Total</p>
                              <p className="text-2xl font-bold text-blue-600">
                                ${(goal?.current + parseFloat(addMoneyAmount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                if (!addMoneyAmount || isNaN(addMoneyAmount) || parseFloat(addMoneyAmount) <= 0) {
                                  showNotification('Please enter a valid amount', 'error')
                                  return
                                }
                                const newAmount = goal.current + parseFloat(addMoneyAmount)
                                setSavingsGoals(savingsGoals.map(g =>
                                  g.id === addMoneyGoalId ? { ...g, current: newAmount } : g
                                ))
                                showNotification(`Added $${parseFloat(addMoneyAmount).toFixed(2)} to ${goal.name}`, 'success')
                                setShowAddMoneyModal(false)
                                setAddMoneyGoalId(null)
                                setAddMoneyAmount('')
                              }}
                              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                            >
                              Add Money
                            </button>
                            <button
                              onClick={() => {
                                setShowAddMoneyModal(false)
                                setAddMoneyGoalId(null)
                                setAddMoneyAmount('')
                              }}
                              className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Edit Amount Modal */}
              {showEditAmountModal && editAmountGoalId && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(4px)' }}>
                  <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md w-full">
                    {(() => {
                      const goal = savingsGoals.find(g => g.id === editAmountGoalId)
                      return (
                        <>
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">Edit Amount</h3>
                            <button
                              onClick={() => {
                                setShowEditAmountModal(false)
                                setEditAmountGoalId(null)
                                setEditAmount('')
                              }}
                              className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="mb-6">
                            <p className="text-gray-600 mb-2">Goal: <span className="font-bold text-gray-900">{goal?.name}</span></p>
                            <p className="text-sm text-gray-500">Target: ${goal?.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>

                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Total Saved ($)</label>
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                              autoFocus
                            />
                          </div>

                          {editAmount && !isNaN(editAmount) && (
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm text-gray-600 mb-1">Progress</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {Math.round((parseFloat(editAmount) / goal?.targetAmount) * 100)}%
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                ${parseFloat(editAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} of ${goal?.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                if (!editAmount || isNaN(editAmount) || parseFloat(editAmount) < 0) {
                                  showNotification('Please enter a valid amount', 'error')
                                  return
                                }
                                setSavingsGoals(savingsGoals.map(g =>
                                  g.id === editAmountGoalId ? { ...g, current: parseFloat(editAmount) } : g
                                ))
                                showNotification(`Updated ${goal.name} to $${parseFloat(editAmount).toFixed(2)}`, 'success')
                                setShowEditAmountModal(false)
                                setEditAmountGoalId(null)
                                setEditAmount('')
                              }}
                              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => {
                                setShowEditAmountModal(false)
                                setEditAmountGoalId(null)
                                setEditAmount('')
                              }}
                              className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Debt Payoff Comparison Modal */}
          {showDebtPayoffComparison && payoffComparison && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(4px)' }}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6 flex items-center justify-between border-b border-purple-200">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-1">Debt Payoff Strategy Comparison</h2>
                    <p className="text-purple-100">Compare Snowball vs Avalanche methods to find the best strategy for you</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowDebtPayoffComparison(false)
                      setSelectedPayoffMethod(null)
                    }}
                    className="text-white hover:text-purple-100 text-3xl font-light"
                  >
                    ✕
                  </button>
                </div>

                {/* Content */}
                <div className="p-8">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                      <p className="text-sm font-medium text-blue-700 mb-2">Total Debt</p>
                      <h3 className="text-2xl font-bold text-blue-900">${payoffComparison.totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                      <p className="text-xs text-blue-600 mt-2">{payoffComparison.debts.length} debt{payoffComparison.debts.length !== 1 ? 's' : ''}</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <p className="text-sm font-medium text-green-700 mb-2">Monthly Payment</p>
                      <h3 className="text-2xl font-bold text-green-900">${payoffComparison.monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                      <p className="text-xs text-green-600 mt-2">Recommended amount</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                      <p className="text-sm font-medium text-orange-700 mb-2">Interest Savings</p>
                      <h3 className="text-2xl font-bold text-orange-900">${payoffComparison.interestSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                      <p className="text-xs text-orange-600 mt-2">Avalanche vs Snowball</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                      <p className="text-sm font-medium text-purple-700 mb-2">Time Savings</p>
                      <h3 className="text-2xl font-bold text-purple-900">{payoffComparison.timeSavings} months</h3>
                      <p className="text-xs text-purple-600 mt-2">Avalanche faster</p>
                    </div>
                  </div>

                  {/* Comparison Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Snowball Method */}
                    <div className={`rounded-2xl border-2 p-8 transition-all cursor-pointer ${selectedPayoffMethod === 'snowball' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
                      onClick={() => setSelectedPayoffMethod(selectedPayoffMethod === 'snowball' ? null : 'snowball')}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="text-4xl">❄️</div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Debt Snowball</h3>
                          <p className="text-sm text-gray-600">Pay smallest balance first</p>
                        </div>
                      </div>

                      <div className="space-y-4 mt-6">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Debt-Free Date</p>
                          <p className="text-xl font-bold text-gray-900">{payoffComparison.snowball.debtFreeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                          <p className="text-xs text-gray-500 mt-1">{payoffComparison.snowball.totalMonths} months from now</p>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Total Interest Paid</p>
                          <p className="text-xl font-bold text-gray-900">${payoffComparison.snowball.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <p className="text-sm font-medium text-blue-900 mb-2">✓ Why Choose Snowball?</p>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Quick psychological wins</li>
                            <li>• Motivating progress</li>
                            <li>• Easier to stay committed</li>
                            <li>• Great for beginners</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Avalanche Method */}
                    <div className={`rounded-2xl border-2 p-8 transition-all cursor-pointer ${selectedPayoffMethod === 'avalanche' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-300'}`}
                      onClick={() => setSelectedPayoffMethod(selectedPayoffMethod === 'avalanche' ? null : 'avalanche')}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="text-4xl">🏔️</div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Debt Avalanche</h3>
                          <p className="text-sm text-gray-600">Pay highest interest rate first</p>
                        </div>
                      </div>

                      <div className="space-y-4 mt-6">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Debt-Free Date</p>
                          <p className="text-xl font-bold text-gray-900">{payoffComparison.avalanche.debtFreeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                          <p className="text-xs text-gray-500 mt-1">{payoffComparison.avalanche.totalMonths} months from now</p>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Total Interest Paid</p>
                          <p className="text-xl font-bold text-gray-900">${payoffComparison.avalanche.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <p className="text-sm font-medium text-orange-900 mb-2">✓ Why Choose Avalanche?</p>
                          <ul className="text-sm text-orange-800 space-y-1">
                            <li>• Saves the most money</li>
                            <li>• Mathematically optimal</li>
                            <li>• Faster debt freedom</li>
                            <li>• Best for discipline</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Your Debts - Only show when no method selected */}
                  {!selectedPayoffMethod && (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-8">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">Your Debts</h4>
                      <div className="space-y-3">
                        {payoffComparison.debts.map((debt, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 flex items-center justify-between border border-gray-200">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{debt.description || debt.category}</p>
                              <p className="text-sm text-gray-600">Interest Rate: {debt.interestRate || 0}%</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">${debt.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              <p className="text-xs text-gray-500">Balance</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation - Only show when no method selected */}
                  {!selectedPayoffMethod && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200 mb-8">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">💡 Recommendation</h4>
                      <p className="text-gray-700 mb-3">
                        {payoffComparison.interestSavings > 1000
                          ? `The Debt Avalanche method will save you $${payoffComparison.interestSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })} in interest and get you debt-free ${payoffComparison.timeSavings} months faster. However, if you need motivation, the Snowball method provides quick wins.`
                          : `Both methods are very similar in your case. Choose based on your personality: Snowball for motivation, Avalanche for maximum savings.`
                        }
                      </p>
                      <p className="text-sm text-gray-600">
                        Remember: The best method is the one you'll stick with! Consistency matters more than which strategy you choose.
                      </p>
                    </div>
                  )}

                  {/* Close Button */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDebtPayoffComparison(false)
                        setSelectedPayoffMethod(null)
                      }}
                      className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors"
                    >
                      Close
                    </button>
                    {selectedPayoffMethod && (
                      <button
                        onClick={() => {
                          setChosenPayoffMethod(selectedPayoffMethod)
                          showNotification(`You selected the ${selectedPayoffMethod === 'snowball' ? 'Snowball' : 'Avalanche'} method! Start paying off your debts today.`, 'success')
                          setShowDebtPayoffComparison(false)
                          setSelectedPayoffMethod(null)
                        }}
                        className="flex-1 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
                      >
                        ✓ Choose {selectedPayoffMethod === 'snowball' ? 'Snowball' : 'Avalanche'}
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
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Debt Payoff Strategy</h2>
                  <p className="text-gray-600">
                    {chosenPayoffMethod
                      ? `Using ${chosenPayoffMethod === 'snowball' ? 'Snowball' : 'Avalanche'} method`
                      : 'Compare Snowball vs Avalanche methods to find the best strategy for you'
                    }
                  </p>
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
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors shadow-lg"
                >
                  {chosenPayoffMethod ? '🔄 Change Method' : '📊 Compare Methods'}
                </button>
              </div>

              {/* If method is chosen, show comprehensive strategy */}
              {chosenPayoffMethod && payoffComparison ? (
                <div className="space-y-6">
                  {/* Monthly Allocation Input */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Monthly Debt Payoff Allocation</h3>
                    <p className="text-gray-600 mb-4">
                      Your current monthly net income is <span className="font-bold text-purple-600">${(totalIncome - totalExpense).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </p>

                    {/* Minimum Payments Info */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-red-900 font-medium">Minimum Monthly Payments Required:</p>
                      <p className="text-2xl font-bold text-red-700">${payoffComparison.monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-red-600 mt-2">This is the sum of minimum payments for credit cards and personal loans only (excludes auto loans and student loans)</p>
                    </div>

                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Extra Monthly Payment (on top of minimums)</label>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-700">$</span>
                          <input
                            type="number"
                            value={debtPayoffAllocation}
                            onChange={(e) => setDebtPayoffAllocation(e.target.value)}
                            placeholder="0.00"
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Total monthly payment: ${(payoffComparison.monthlyPayment + (parseFloat(debtPayoffAllocation) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <button
                        onClick={() => setDebtPayoffAllocation('0')}
                        className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Strategy Summary */}
                  {debtPayoffAllocation && (
                    (() => {
                      const extraAllocation = parseFloat(debtPayoffAllocation) || 0
                      const monthlyAmount = payoffComparison.monthlyPayment + extraAllocation
                      const selectedStrategy = chosenPayoffMethod === 'snowball' ? payoffComparison.snowball : payoffComparison.avalanche

                      // Recalculate with custom monthly amount (minimum payments + extra allocation)
                      const customStrategy = chosenPayoffMethod === 'snowball'
                        ? calculateSnowball(payoffComparison.debts, monthlyAmount)
                        : calculateAvalanche(payoffComparison.debts, monthlyAmount)

                      return (
                        <div className="space-y-6">
                          {/* Key Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                              <p className="text-sm font-medium text-blue-700 mb-2">Debt-Free Date</p>
                              <h3 className="text-2xl font-bold text-blue-900">{customStrategy.debtFreeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</h3>
                              <p className="text-xs text-blue-600 mt-2">{customStrategy.totalMonths} months from now</p>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                              <p className="text-sm font-medium text-green-700 mb-2">Total Interest Paid</p>
                              <h3 className="text-2xl font-bold text-green-900">${customStrategy.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                              <p className="text-xs text-green-600 mt-2">Over {customStrategy.totalMonths} months</p>
                            </div>

                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                              <p className="text-sm font-medium text-orange-700 mb-2">Total Amount Paid</p>
                              <h3 className="text-2xl font-bold text-orange-900">${(payoffComparison.totalDebt + customStrategy.totalInterest).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                              <p className="text-xs text-orange-600 mt-2">Principal + Interest</p>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                              <p className="text-sm font-medium text-purple-700 mb-2">Monthly Payment</p>
                              <h3 className="text-2xl font-bold text-purple-900">${monthlyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                              <p className="text-xs text-purple-600 mt-2">Your allocation</p>
                            </div>
                          </div>

                          {/* Payoff Schedule */}
                          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">
                              {chosenPayoffMethod === 'snowball' ? '❄️ Snowball' : '🏔️ Avalanche'} Payoff Schedule
                            </h3>
                            <div className="space-y-4">
                              {customStrategy.payoffSchedule.map((debt, index) => {
                                const debtId = debt.id || `${debt.description}-${index}`
                                const isPaidOff = paidOffDebts[debtId]
                                return (
                                <div key={index} className={`bg-gradient-to-r from-gray-50 to-white rounded-lg p-6 border transition-all ${isPaidOff ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="checkbox"
                                        checked={isPaidOff}
                                        onChange={() => handleMarkDebtPaidOff(debtId, debt.description || debt.category)}
                                        className="w-6 h-6 rounded border-2 border-purple-500 cursor-pointer accent-purple-500"
                                      />
                                      <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <p className={`font-bold text-lg transition-all ${isPaidOff ? 'text-green-600 line-through' : 'text-gray-900'}`}>
                                          {debt.description || debt.category}
                                        </p>
                                        <p className={`text-sm transition-all ${isPaidOff ? 'text-green-600' : 'text-gray-600'}`}>
                                          Interest Rate: {debt.interestRate || 0}%
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-gray-600">Payoff Month</p>
                                      <p className="text-2xl font-bold text-purple-600">{debt.payoffMonth}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-600 text-xs font-medium">Starting Balance</p>
                                      <p className="font-bold text-gray-900">${debt.startingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-600 text-xs font-medium">Total Interest</p>
                                      <p className="font-bold text-gray-900">${debt.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-600 text-xs font-medium">Total Paid</p>
                                      <p className="font-bold text-gray-900">${debt.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-600 text-xs font-medium">Payoff Date</p>
                                      <p className="font-bold text-gray-900">
                                        {new Date(new Date().setMonth(new Date().getMonth() + debt.payoffMonth)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Action Items */}
                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow-lg border border-purple-200 p-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Your Action Plan</h3>
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">1</div>
                                <div>
                                  <p className="font-semibold text-gray-900">Focus on {customStrategy.payoffSchedule[0].description || customStrategy.payoffSchedule[0].category}</p>
                                  <p className="text-sm text-gray-600">Pay as much as possible toward this debt while making minimum payments on others</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">2</div>
                                <div>
                                  <p className="font-semibold text-gray-900">Allocate ${extraAllocation.toLocaleString('en-US', { minimumFractionDigits: 2 })} per month</p>
                                  <p className="text-sm text-gray-600">Add this to the ${customStrategy.payoffSchedule[0].minPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })} minimum payment on {customStrategy.payoffSchedule[0].description || customStrategy.payoffSchedule[0].category}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">3</div>
                                <div>
                                  <p className="font-semibold text-gray-900">Stay consistent for {customStrategy.totalMonths} months</p>
                                  <p className="text-sm text-gray-600">You'll be debt-free by {customStrategy.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">4</div>
                                <div>
                                  <p className="font-semibold text-gray-900">Save ${customStrategy.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })} in interest</p>
                                  <p className="text-sm text-gray-600">By following this plan, you'll minimize the total interest paid</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Change Method Button */}
                          <button
                            onClick={() => {
                              setChosenPayoffMethod(null)
                              setDebtPayoffAllocation('')
                            }}
                            className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors"
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
              {/* Total Liabilities Chart */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-2">TOTAL LIABILITIES</p>
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-4xl font-bold text-gray-900">
                        ${netWorth.totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h2>
                      <span className="text-gray-600 text-sm">Current balance</span>
                    </div>
                  </div>
                  <select
                    value={liabilitiesTimeframe}
                    onChange={(e) => setLiabilitiesTimeframe(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  >
                    <option value="1month">1 month</option>
                    <option value="3months">3 months</option>
                    <option value="6months">6 months</option>
                    <option value="1year">1 year</option>
                  </select>
                </div>

                {/* Liabilities Trend Chart */}
                {liabilitiesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={liabilitiesChartData}>
                      <defs>
                        <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                      />
                      <Area type="monotone" dataKey="liabilities" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorLiabilities)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No data available yet
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Accounts */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Credit Cards */}
                  {accountsByType.creditCards.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">💳 Credit Cards</h3>
                        <span className="text-sm text-gray-600">
                          ${accountsByType.creditCards.reduce((sum, card) => sum + card.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {accountsByType.creditCards.map(card => (
                          <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{card.name}</p>
                              <p className="text-sm text-gray-600">Credit Card</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">${card.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              {card.interestRate > 0 && (
                                <p className="text-sm text-orange-600">{card.interestRate}% APR</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loans */}
                  {accountsByType.loans.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">🏦 Loans</h3>
                        <span className="text-sm text-gray-600">
                          ${accountsByType.loans.reduce((sum, loan) => sum + loan.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {accountsByType.loans.map(loan => (
                          <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{loan.name}</p>
                              <p className="text-sm text-gray-600">Loan</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">${loan.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              {loan.interestRate > 0 && (
                                <p className="text-sm text-blue-600">{loan.interestRate}% APR</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto Loans */}
                  {accountsByType.autoLoans.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">🚗 Auto Loans</h3>
                        <span className="text-sm text-gray-600">
                          ${accountsByType.autoLoans.reduce((sum, loan) => sum + loan.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {accountsByType.autoLoans.map(loan => (
                          <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{loan.name}</p>
                              <p className="text-sm text-gray-600">Auto Loan</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">${loan.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              {loan.interestRate > 0 && (
                                <p className="text-sm text-orange-600">{loan.interestRate}% APR</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student Loans */}
                  {accountsByType.studentLoans.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">🎓 Student Loans</h3>
                        <span className="text-sm text-gray-600">
                          ${accountsByType.studentLoans.reduce((sum, loan) => sum + loan.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {accountsByType.studentLoans.map(loan => (
                          <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{loan.name}</p>
                              <p className="text-sm text-gray-600">Student Loan</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">${loan.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              {loan.interestRate > 0 && (
                                <p className="text-sm text-purple-600">{loan.interestRate}% APR</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Debts */}
                  {accountsByType.otherDebts.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">⚠️ Other Debts</h3>
                        <span className="text-sm text-gray-600">
                          ${accountsByType.otherDebts.reduce((sum, debt) => sum + debt.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {accountsByType.otherDebts.map(debt => (
                          <div key={debt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{debt.name}</p>
                              <p className="text-sm text-gray-600">Debt</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">${debt.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              {debt.interestRate > 0 && (
                                <p className="text-sm text-red-600">{debt.interestRate}% APR</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assets */}
                  {accountsByType.assets.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">💰 Assets</h3>
                        <span className="text-sm text-green-600 font-semibold">
                          ${accountsByType.assets.reduce((sum, asset) => sum + asset.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {accountsByType.assets.map(asset => (
                          <div key={asset.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{asset.name}</p>
                              <p className="text-sm text-gray-600">Asset</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">${asset.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Summary */}
                <div className="bg-gray-50 rounded-lg p-6 h-fit">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
                    <div className="flex gap-4 text-xs font-medium text-gray-600">
                      <span>Totals</span>
                      <span>Percent</span>
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
          )}

          {/* Reports Section */}
          {activeSection === 'reports' && (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-6">
                <button
                  onClick={() => setReportsTab('cashflow')}
                  className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                    reportsTab === 'cashflow'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  Cash Flow
                </button>
                <button
                  onClick={() => setReportsTab('spending')}
                  className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                    reportsTab === 'spending'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  Spending
                </button>
                <button
                  onClick={() => setReportsTab('income')}
                  className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                    reportsTab === 'income'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Main Content */}
              {reportsTab === 'cashflow' && (
                <div className="bg-white rounded-lg border border-gray-200 p-6" style={{ height: '800px' }}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Cash Flow</h3>
                  <ResponsiveSankey
                    data={{
                      nodes: (() => {
                        const nodes = [];

                        // Sort income and expenses by value (descending) for consistent vertical ordering
                        const sortedIncome = [...budgetData.income].sort((a, b) => b.actual - a.actual);
                        const sortedExpenses = [...budgetData.expenses].sort((a, b) => b.actual - a.actual);

                        // Stable color assignment for expenses based on original index
                        const expenseColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#a855f7'];
                        const expenseIndexMap = new Map();
                        budgetData.expenses.forEach((item, idx) => {
                          expenseIndexMap.set(item.category, idx);
                        });

                        // Add income sources (sorted)
                        sortedIncome.forEach((item) => {
                          nodes.push({
                            id: item.category,
                            color: '#10b981'
                          });
                        });

                        // Add middle node (Total Income)
                        nodes.push({
                          id: 'Total Income',
                          color: '#06b6d4'
                        });

                        // Add expense categories (sorted)
                        sortedExpenses.forEach((item) => {
                          const idx = expenseIndexMap.get(item.category) ?? 0;
                          nodes.push({
                            id: item.category,
                            color: expenseColors[idx % expenseColors.length]
                          });
                        });

                        return nodes;
                      })(),
                      links: (() => {
                        const links = [];

                        // Sort inputs by value (descending) to mirror node order
                        const sortedIncome = [...budgetData.income].sort((a, b) => b.actual - a.actual);
                        const sortedExpenses = [...budgetData.expenses].sort((a, b) => b.actual - a.actual);

                        // Links from income sources to total income
                        sortedIncome.forEach((item) => {
                          links.push({
                            source: item.category,
                            target: 'Total Income',
                            value: item.actual
                          });
                        });

                        // Links from total income to expenses
                        sortedExpenses.forEach((item) => {
                          links.push({
                            source: 'Total Income',
                            target: item.category,
                            value: item.actual
                          });
                        });

                        return links;
                      })()
                    }}
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
                  <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-6 relative" style={{ height: '450px' }}>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly</h3>
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
                  <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
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
                      className="text-sm text-blue-600 hover:text-blue-700 mt-4"
                    >
                      {showAllCategories ? 'Show top 12 categories' : 'View all categories'} →
                    </button>
                  </div>
                </div>
              )}

              {reportsTab === 'income' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left - Pie Chart */}
                  <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-6 relative" style={{ height: '450px' }}>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly</h3>
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
                  <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
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
                      className="text-sm text-blue-600 hover:text-blue-700 mt-4"
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
                                  {(() => {
                                    // Match Transactions section: handle both date strings (YYYY-MM-DD) and timestamps
                                    if (typeof transaction.createdAt === 'string') {
                                      const [year, month, day] = transaction.createdAt.split('-')
                                      return new Date(year, parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        year: 'numeric',
                                      })
                                    } else {
                                      return new Date(transaction.createdAt).toLocaleDateString('en-US', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        year: 'numeric',
                                      })
                                    }
                                  })()}
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
                        <span className="text-sm font-medium text-gray-900">
                          {(() => {
                            const filteredTransactions = transactions.filter(transaction => {
                              if (reportsTab === 'spending') return transaction.type === 'expense'
                              if (reportsTab === 'income') return transaction.type === 'income'
                              return true
                            })
                            return filteredTransactions.length
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">Largest transaction</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(() => {
                            const filteredTransactions = transactions.filter(transaction => {
                              if (reportsTab === 'spending') return transaction.type === 'expense'
                              if (reportsTab === 'income') return transaction.type === 'income'
                              return true
                            })
                            return '$' + Math.max(...filteredTransactions.map(t => t.amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">Average transaction</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(() => {
                            const filteredTransactions = transactions.filter(transaction => {
                              if (reportsTab === 'spending') return transaction.type === 'expense'
                              if (reportsTab === 'income') return transaction.type === 'income'
                              return true
                            })
                            return '$' + (filteredTransactions.reduce((sum, t) => sum + t.amount, 0) / filteredTransactions.length || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">Total income</span>
                        <span className="text-sm font-semibold text-green-600">
                          {(() => {
                            const filteredTransactions = transactions.filter(transaction => {
                              if (reportsTab === 'spending') return transaction.type === 'expense'
                              if (reportsTab === 'income') return transaction.type === 'income'
                              return true
                            })
                            const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                            return '+$' + income.toLocaleString('en-US', { minimumFractionDigits: 2 })
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">Total spending</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(() => {
                            const filteredTransactions = transactions.filter(transaction => {
                              if (reportsTab === 'spending') return transaction.type === 'expense'
                              if (reportsTab === 'income') return transaction.type === 'income'
                              return true
                            })
                            const spending = filteredTransactions.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0)
                            return '$' + spending.toLocaleString('en-US', { minimumFractionDigits: 2 })
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">First transaction</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(() => {
                            const filteredTransactions = transactions.filter(transaction => {
                              if (reportsTab === 'spending') return transaction.type === 'expense'
                              if (reportsTab === 'income') return transaction.type === 'income'
                              return true
                            })
                            if (filteredTransactions.length === 0) return 'N/A'
                            const toTs = (createdAt) => {
                              if (typeof createdAt === 'string') {
                                const [y, m, d] = createdAt.split('-')
                                return new Date(y, parseInt(m) - 1, parseInt(d)).getTime()
                              }
                              return new Date(createdAt).getTime()
                            }
                            const minTs = Math.min(...filteredTransactions.map(t => toTs(t.createdAt)))
                            return new Date(minTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-600">Last transaction</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(() => {
                            const filteredTransactions = transactions.filter(transaction => {
                              if (reportsTab === 'spending') return transaction.type === 'expense'
                              if (reportsTab === 'income') return transaction.type === 'income'
                              return true
                            })
                            if (filteredTransactions.length === 0) return 'N/A'
                            const toTs = (createdAt) => {
                              if (typeof createdAt === 'string') {
                                const [y, m, d] = createdAt.split('-')
                                return new Date(y, parseInt(m) - 1, parseInt(d)).getTime()
                              }
                              return new Date(createdAt).getTime()
                            }
                            const maxTs = Math.max(...filteredTransactions.map(t => toTs(t.createdAt)))
                            return new Date(maxTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          })()}
                        </span>
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
              {/* Calendar Header */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {(() => {
                        const billsThisMonth = transactions.filter(t => {
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
                        })
                        const totalDue = billsThisMonth.reduce((sum, t) => sum + t.amount, 0)
                        return `${billsThisMonth.length} bills due • $${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      })()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date())}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Day Headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold text-gray-600 py-3 text-sm">
                      {day}
                    </div>
                  ))}

                  {/* Calendar Days */}
                  {calendarData.map((day, index) => {
                    const today = new Date()
                    const isToday = day && day.day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()

                    return (
                      <div
                        key={index}
                        onClick={() => day && setSelectedDay(day)}
                        className={`min-h-24 p-2 rounded-lg border transition-all ${
                          day === null
                            ? 'bg-gray-50 border-transparent'
                            : isToday
                            ? 'bg-orange-50 border-2 border-orange-400 hover:border-orange-500 cursor-pointer ring-2 ring-orange-200'
                            : day.bills.length > 0
                            ? 'bg-blue-50 border-blue-200 hover:border-blue-400 cursor-pointer'
                            : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
                        }`}
                      >
                        {day && (
                          <>
                            <div className={`font-semibold mb-1 flex items-center gap-1 ${isToday ? 'text-orange-600' : 'text-gray-900'}`}>
                              {day.day}
                              {isToday && <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded">Today</span>}
                            </div>
                            {day.bills.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded inline-block">
                                  {day.bills.length} bill{day.bills.length !== 1 ? 's' : ''}
                                </div>
                                <div className="text-xs text-gray-600 font-medium">
                                  ${day.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="space-y-0.5 mt-1">
                                  {day.bills.slice(0, 2).map((bill, idx) => (
                                    <div key={idx} className="text-xs text-gray-700 truncate hover:text-gray-900">
                                      • {bill.description}
                                    </div>
                                  ))}
                                  {day.bills.length > 2 && (
                                    <div className="text-xs text-gray-500">
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

              {/* Selected Day Modal - Bills List or Edit Form */}
              {selectedDay && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(4px)' }}>
                  <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
                    {/* If editing a transaction, show edit form */}
                    {editingId && isEditing ? (
                      <>
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                          <h2 className="text-2xl font-bold text-gray-900">Edit Transaction</h2>
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
                            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                          >
                            ×
                          </button>
                        </div>

                        <div className="p-6">
                          <div className="space-y-4">
                            <input
                              type="text"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Description"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="Amount"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <select
                              value={type}
                              onChange={(e) => setType(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="income">Income</option>
                              <option value="expense">Expense</option>
                            </select>
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            {type === 'expense' && (
                              <div className="px-4 py-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Spending Type</label>
                                <div className="space-y-2">
                                  <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{borderColor: spendingType === 'fixed' ? '#3b82f6' : '#d1d5db', backgroundColor: spendingType === 'fixed' ? '#eff6ff' : 'white'}}>
                                    <input
                                      type="radio"
                                      name="spendingType"
                                      value="fixed"
                                      checked={spendingType === 'fixed'}
                                      onChange={(e) => setSpendingType(e.target.value)}
                                      className="w-4 h-4"
                                    />
                                    <div>
                                      <div className="font-medium">Fixed</div>
                                      <div className="text-xs text-gray-600">Same every month, hard to reduce</div>
                                    </div>
                                  </label>
                                  <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{borderColor: spendingType === 'flexible' ? '#3b82f6' : '#d1d5db', backgroundColor: spendingType === 'flexible' ? '#eff6ff' : 'white'}}>
                                    <input
                                      type="radio"
                                      name="spendingType"
                                      value="flexible"
                                      checked={spendingType === 'flexible'}
                                      onChange={(e) => setSpendingType(e.target.value)}
                                      className="w-4 h-4"
                                    />
                                    <div>
                                      <div className="font-medium">Flexible</div>
                                      <div className="text-xs text-gray-600">Changes monthly, can be reduced</div>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            )}
                            <label className="flex items-center gap-2 px-4 py-2">
                              <input
                                type="checkbox"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="w-4 h-4"
                              />
                              <span>Recurring</span>
                            </label>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Date</label>
                              <input
                                type="date"
                                value={transactionDate}
	                                onChange={(e) => {
	                                  setTransactionDate(e.target.value)
	                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <input
                              type="number"
                              value={interestRate}
                              onChange={(e) => setInterestRate(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Interest Rate (%)"
                            />
                          </div>

                          <div className="flex gap-4 mt-6">
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
                              className="flex-1 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                            >
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
                              className="flex-1 px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Bills List View */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                              {selectedDay.day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()
                                ? `Today - ${currentMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                                : currentMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).replace(/\d+/, selectedDay.day)
                              }
                            </h2>
                            <p className="text-gray-600 mt-1">
                              {selectedDay.bills.length} bill{selectedDay.bills.length !== 1 ? 's' : ''} • ${selectedDay.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedDay(null)}
                            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                          >
                            ×
                          </button>
                        </div>

                        <div className="p-6">
                          {selectedDay.bills.length > 0 ? (
                            <div className="space-y-3">
                              {selectedDay.bills.map((bill, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{bill.description}</p>
                                    <p className="text-sm text-gray-600 mt-1">{bill.category || 'Uncategorized'}</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="font-bold text-gray-900">
                                        ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => {
                                        handleEditTransaction(bill)
                                      }}
                                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-gray-600">No bills on this day</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Bills List */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">All Bills This Month</h3>
                {(() => {
                  const billsThisMonth = transactions.filter(t => {
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

                  return billsThisMonth.length > 0 ? (
                    <div className="space-y-3">
                      {billsThisMonth.map((bill, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                {(() => {
                                  let dueDay
                                  if (typeof bill.createdAt === 'string') {
                                    const [, , day] = bill.createdAt.split('-')
                                    dueDay = parseInt(day)
                                  } else if (typeof bill.createdAt === 'number') {
                                    const date = new Date(bill.createdAt)
                                    dueDay = date.getDate()
                                  }
                                  return dueDay
                                })()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{bill.description}</p>
                                <p className="text-sm text-gray-600">{bill.category || 'Uncategorized'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(() => {
                                let dueDay
                                if (typeof bill.createdAt === 'string') {
                                  const [, , day] = bill.createdAt.split('-')
                                  dueDay = parseInt(day)
                                } else if (typeof bill.createdAt === 'number') {
                                  const date = new Date(bill.createdAt)
                                  dueDay = date.getDate()
                                }
                                return `Due on the ${dueDay}${['st', 'nd', 'rd'][((dueDay - 1) % 10)] || 'th'}`
                              })()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-3">✨</div>
                      <p className="text-gray-600 text-lg">No bills scheduled for this month</p>
                    </div>
                  )
                })()}
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
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}>
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md w-full">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">⚠️</span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
                  Delete {deleteConfirmData.type === 'transaction' ? 'Transaction' : deleteConfirmData.type === 'goal' ? 'Goal' : 'Item'}?
                </h3>

                <p className="text-gray-600 text-center mb-6">
                  {deleteConfirmData.type === 'transaction' && (
                    <>
                      Are you sure you want to delete <span className="font-semibold">"{deleteConfirmData.description}"</span>? This action cannot be undone.
                    </>
                  )}
                  {deleteConfirmData.type === 'goal' && (
                    <>
                      Are you sure you want to delete the goal <span className="font-semibold">"{deleteConfirmData.description}"</span>? This action cannot be undone.
                    </>
                  )}
                  {deleteConfirmData.type === 'reset' && (
                    <>
                      Are you sure you want to reset for a new month? This will delete <span className="font-semibold">{deleteConfirmData.count} non-recurring transaction(s)</span> and keep all recurring transactions. This action cannot be undone.
                    </>
                  )}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirmModal(false)
                      setDeleteConfirmData(null)
                    }}
                    className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors"
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
                    className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Delete
                  </button>
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
        </div>
      </div>
    </div>
  )
}

export default Dashboard
