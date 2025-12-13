import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useCallback, useEffect, useState } from 'react'

const ONBOARDING_STORAGE_KEY = 'finance-tracker-onboarding-completed'

// Build tour steps with section navigation
const buildTourSteps = (setActiveSection) => [
  {
    element: '#sidebar-nav',
    popover: {
      title: 'Welcome to Keel! 👋',
      description: 'This is your navigation menu. Access all features from here. Let\'s take a quick tour!',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '#nav-transactions',
    popover: {
      title: '💳 Transactions — Start Here!',
      description: '<strong>This is the most important section.</strong> Everything depends on your transaction data. Add income, expenses, and debts here first.',
      side: 'right',
      align: 'start'
    },
    onHighlightStarted: () => {
      setActiveSection('transactions')
    }
  },
  {
    element: '#add-transaction-btn',
    popover: {
      title: 'Add Your First Transaction',
      description: 'Click here to add income, expenses, or debt. Include description, amount, category, and mark recurring items like rent or salary.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#nav-dashboard',
    popover: {
      title: '📊 Dashboard',
      description: 'Your financial summary at a glance. See spending trends, recent transactions, and quick stats.',
      side: 'right',
      align: 'start'
    },
    onHighlightStarted: () => {
      setActiveSection('dashboard')
    }
  },
  {
    element: '#nav-budget',
    popover: {
      title: '💼 Budget',
      description: 'Set monthly budgets for different categories. Track spending vs. budget to stay on track.',
      side: 'right',
      align: 'start'
    },
    onHighlightStarted: () => {
      setActiveSection('budget')
    }
  },
  {
    element: '#nav-cashflow',
    popover: {
      title: '💰 Cash Flow',
      description: 'Visualize your money flow month by month. See income vs. expenses and track net savings.',
      side: 'right',
      align: 'start'
    },
    onHighlightStarted: () => {
      setActiveSection('cashflow')
    }
  },
  {
    element: '#nav-savings',
    popover: {
      title: '🎯 Savings Goals',
      description: 'Create savings goals for vacations, emergency funds, or big purchases. Track your progress!',
      side: 'right',
      align: 'start'
    },
    onHighlightStarted: () => {
      setActiveSection('savings')
    }
  },
  {
    element: '#nav-goals',
    popover: {
      title: '💳 Debt Payoff',
      description: 'Track debts and use Snowball or Avalanche strategies to pay them off faster.',
      side: 'right',
      align: 'start'
    },
    onHighlightStarted: () => {
      setActiveSection('goals')
    }
  },
  {
    element: '#nav-calendar',
    popover: {
      title: '📅 Calendar',
      description: 'View upcoming bills and recurring transactions. Never miss a payment!',
      side: 'right',
      align: 'start'
    },
    onHighlightStarted: () => {
      setActiveSection('calendar')
    }
  },
  {
    element: '#help-tour-btn',
    popover: {
      title: '🔄 Restart Tour Anytime',
      description: 'Click this button whenever you need a refresher. Now head to <strong>Transactions</strong> to add your first entry!',
      side: 'left',
      align: 'start'
    }
  }
]

export function useOnboarding(setActiveSection) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
  })

  const startTour = useCallback(() => {
    const driverInstance = driver({
      showProgress: true,
      animate: false,  // Disable animations to prevent blur
      smoothScroll: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.65)',
      stagePadding: 10,
      stageRadius: 8,
      steps: buildTourSteps(setActiveSection),
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Get Started',
      progressText: '{{current}} / {{total}}',
      popoverClass: 'finance-tracker-tour',
      onDestroyed: () => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
        setHasCompletedOnboarding(true)
        // Navigate to transactions after tour completes
        setActiveSection('transactions')
      }
    })

    driverInstance.drive()
  }, [setActiveSection])

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    setHasCompletedOnboarding(false)
  }, [])

  // Auto-start tour for first-time users after a short delay
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      const timer = setTimeout(() => {
        startTour()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [hasCompletedOnboarding, startTour])

  return { hasCompletedOnboarding, startTour, resetOnboarding }
}

export default useOnboarding

