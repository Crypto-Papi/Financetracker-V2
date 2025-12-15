import { PageLayout } from './PageLayout'

/**
 * Budgeting feature page - explains budgeting capabilities
 */
export function BudgetingPage({ onBack, onNavigate, onGetStarted }) {
  const features = [
    {
      icon: '🎯',
      title: 'Flexible Budget Categories',
      description: 'Create budgets that work for you. Set monthly limits for groceries, entertainment, dining out, and more.'
    },
    {
      icon: '📊',
      title: 'Visual Progress Tracking',
      description: 'See at a glance how much you\'ve spent vs. your budget. Color-coded progress bars make it easy to stay on track.'
    },
    {
      icon: '🔄',
      title: 'Rollover Budgets',
      description: 'Didn\'t spend your full budget? Roll over unused amounts to next month or let them reset automatically.'
    },
    {
      icon: '💡',
      title: 'Smart Recommendations',
      description: 'Keel analyzes your spending patterns and suggests realistic budget amounts based on your actual habits.'
    },
    {
      icon: '📅',
      title: 'Monthly Auto-Reset',
      description: 'Start fresh each month. Non-recurring transactions reset automatically while your recurring bills stay tracked.'
    },
    {
      icon: '🎉',
      title: 'Celebrate Wins',
      description: 'Get positive reinforcement when you stay under budget. Small wins lead to big financial success.'
    }
  ]

  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-block bg-green-500/20 text-green-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          FEATURES
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Budgeting That{' '}
          <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Actually Works
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Create flexible budgets that adapt to your life. No more rigid spreadsheets or 
          complicated formulas—just simple, effective money management.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50 hover:border-green-500/50 transition-all"
          >
            <div className="text-3xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-400">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-3xl p-12 border border-green-500/30">
        <h2 className="text-3xl font-bold mb-4">Start budgeting smarter</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Join thousands who have transformed their finances with Keel's intuitive budgeting tools.
        </p>
        <button
          onClick={onGetStarted}
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full text-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all cursor-pointer"
        >
          Try Keel Free for 7 Days
        </button>
      </div>
    </PageLayout>
  )
}

export default BudgetingPage

