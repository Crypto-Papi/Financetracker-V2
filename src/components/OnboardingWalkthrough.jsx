import { useCallback, useEffect, useState } from 'react'

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Finance Tracker! 👋',
    content: 'Let\'s take a quick tour to help you get started. This app helps you track income, expenses, and reach your financial goals.',
    target: null, // Full screen overlay
    position: 'center'
  },
  {
    id: 'transactions-key',
    title: 'Transactions are Key 🔑',
    content: 'Everything in this app is powered by your transaction data. Adding accurate transactions is the foundation for budgets, reports, and insights.',
    target: null,
    position: 'center'
  },
  {
    id: 'sidebar',
    title: 'Navigation Sidebar 📋',
    content: 'Use the sidebar to navigate between different sections: Dashboard, Accounts, Transactions, Cash Flow, Reports, Budget, Savings, Calendar, and Debt Payoff.',
    target: '[data-tour="sidebar"]',
    position: 'right'
  },
  {
    id: 'transactions-section',
    title: 'Transactions Section 💳',
    content: 'This is where you\'ll add and manage all your income and expenses. Let\'s go there now!',
    target: '[data-tour="nav-transactions"]',
    position: 'right',
    action: 'navigate-transactions'
  },
  {
    id: 'add-transaction-btn',
    title: 'Add Your First Transaction ➕',
    content: 'Click the "Add Transaction" button to record income or expenses. Be sure to include the date, amount, category, and whether it\'s recurring.',
    target: '[data-tour="add-transaction-btn"]',
    position: 'bottom'
  },
  {
    id: 'recurring-tip',
    title: 'Recurring Transactions 🔄',
    content: 'Mark regular bills and income as "recurring" - they\'ll appear in your calendar and help with budget forecasting!',
    target: null,
    position: 'center'
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard 📊',
    content: 'The Dashboard shows your financial overview: spending charts, upcoming payments, and quick stats. It updates automatically as you add transactions.',
    target: '[data-tour="nav-dashboard"]',
    position: 'right'
  },
  {
    id: 'budget',
    title: 'Budget Tracking 💰',
    content: 'Set budgets for each spending category. The app will track your progress and alert you when you\'re close to limits.',
    target: '[data-tour="nav-budget"]',
    position: 'right'
  },
  {
    id: 'debt-payoff',
    title: 'Debt Payoff Strategies 🎯',
    content: 'Got debt? Use the Debt Payoff section to create a Snowball or Avalanche payoff plan and track your progress to becoming debt-free!',
    target: '[data-tour="nav-goals"]',
    position: 'right'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🎉',
    content: 'Start by adding your transactions - income, bills, and expenses. The more accurate your data, the better insights you\'ll get. Happy tracking!',
    target: null,
    position: 'center'
  }
]

function OnboardingWalkthrough({ onComplete, onNavigate }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightRect, setHighlightRect] = useState(null)

  const step = ONBOARDING_STEPS[currentStep]
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1
  const isFirstStep = currentStep === 0

  // Update highlight position when step changes
  useEffect(() => {
    if (step.target) {
      const el = document.querySelector(step.target)
      if (el) {
        const rect = el.getBoundingClientRect()
        setHighlightRect({
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16
        })
      } else {
        setHighlightRect(null)
      }
    } else {
      setHighlightRect(null)
    }
  }, [currentStep, step.target])

  const handleNext = useCallback(() => {
    // Handle navigation actions
    if (step.action === 'navigate-transactions') {
      onNavigate('transactions')
    }

    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }, [step.action, isLastStep, onComplete, onNavigate])

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }, [isFirstStep])

  const handleSkip = useCallback(() => {
    onComplete()
  }, [onComplete])

  // Calculate tooltip position based on target and position prop
  const getTooltipStyle = () => {
    if (!highlightRect || step.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }
    }

    const padding = 20
    switch (step.position) {
      case 'right':
        return {
          position: 'fixed',
          top: highlightRect.top,
          left: highlightRect.left + highlightRect.width + padding
        }
      case 'bottom':
        return {
          position: 'fixed',
          top: highlightRect.top + highlightRect.height + padding,
          left: highlightRect.left
        }
      case 'left':
        return {
          position: 'fixed',
          top: highlightRect.top,
          right: window.innerWidth - highlightRect.left + padding
        }
      default:
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }
    }
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={handleSkip} />

      {/* Highlight cutout for targeted element */}
      {highlightRect && (
        <div
          className="absolute bg-white/10 border-2 border-teal-400 rounded-lg shadow-lg shadow-teal-500/30 animate-pulse"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10"
        style={getTooltipStyle()}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {ONBOARDING_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep
                  ? 'bg-teal-500 w-6'
                  : idx < currentStep
                  ? 'bg-teal-300'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
        <p className="text-gray-600 mb-6 leading-relaxed">{step.content}</p>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors cursor-pointer"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingWalkthrough

