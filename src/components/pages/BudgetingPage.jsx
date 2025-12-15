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
      <div className="text-center mb-20">
        <div className="inline-block bg-[#00d4ff]/10 text-[#00d4ff] text-sm font-semibold px-4 py-2 rounded-full mb-6">
          FEATURES
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#0a2540] leading-tight">
          Budgeting That{' '}
          <span className="bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] bg-clip-text text-transparent">
            Actually Works
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Create flexible budgets that adapt to your life. No more rigid spreadsheets or
          complicated formulas—just simple, effective money management.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-20">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-[#00d4ff] hover:shadow-xl transition-all"
          >
            <div className="text-4xl mb-6">{feature.icon}</div>
            <h3 className="text-xl font-bold mb-3 text-[#0a2540]">{feature.title}</h3>
            <p className="text-gray-600 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] rounded-3xl p-16 shadow-2xl">
        <h2 className="text-4xl font-bold mb-6 text-white">Start budgeting smarter</h2>
        <p className="text-white/90 text-lg mb-10 max-w-xl mx-auto">
          Join thousands who have transformed their finances with Keel's intuitive budgeting tools.
        </p>
        <button
          onClick={onGetStarted}
          className="px-10 py-5 bg-white text-[#00d4ff] rounded-full text-lg font-medium hover:bg-gray-50 transition-all shadow-xl"
        >
          Try Keel Free for 7 Days
        </button>
      </div>
    </PageLayout>
  )
}

export default BudgetingPage

