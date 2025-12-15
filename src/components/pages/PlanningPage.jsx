import { PageLayout } from './PageLayout'

/**
 * Planning feature page - explains financial planning and debt payoff capabilities
 */
export function PlanningPage({ onBack, onNavigate, onGetStarted }) {
  const features = [
    {
      icon: '🎯',
      title: 'Debt Payoff Planner',
      description: 'Visualize your path to becoming debt-free. See exactly when you\'ll pay off each debt and how much interest you\'ll save.'
    },
    {
      icon: '📈',
      title: 'Cash Flow Forecasting',
      description: 'Know what\'s coming before it hits. See your projected balance based on recurring income and expenses.'
    },
    {
      icon: '🏆',
      title: 'Financial Goals',
      description: 'Set savings goals for vacations, emergency funds, or big purchases. Track your progress and stay motivated.'
    },
    {
      icon: '💳',
      title: 'Debt Snowball & Avalanche',
      description: 'Choose your debt payoff strategy. Whether you prefer quick wins or minimizing interest, Keel has you covered.'
    },
    {
      icon: '📊',
      title: 'Net Worth Tracking',
      description: 'See your complete financial picture. Track assets and liabilities to watch your net worth grow over time.'
    },
    {
      icon: '🎉',
      title: 'Milestone Celebrations',
      description: 'Celebrate when you pay off a debt or hit a savings goal. Positive reinforcement keeps you motivated.'
    }
  ]

  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-20">
        <div className="inline-block bg-[#7c3aed]/10 text-[#7c3aed] text-sm font-semibold px-4 py-2 rounded-full mb-6">
          FEATURES
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#0a2540] leading-tight">
          Plan Your Financial{' '}
          <span className="bg-gradient-to-r from-[#7c3aed] to-[#00d4ff] bg-clip-text text-transparent">
            Future
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          From paying off debt to building wealth, Keel helps you create a roadmap
          to achieve your financial dreams.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-20">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-[#7c3aed] hover:shadow-xl transition-all"
          >
            <div className="text-4xl mb-6">{feature.icon}</div>
            <h3 className="text-xl font-bold mb-3 text-[#0a2540]">{feature.title}</h3>
            <p className="text-gray-600 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-br from-[#7c3aed] to-[#00d4ff] rounded-3xl p-16 shadow-2xl">
        <h2 className="text-4xl font-bold mb-6 text-white">Start planning your future</h2>
        <p className="text-white/90 text-lg mb-10 max-w-xl mx-auto">
          Take the first step toward financial freedom with Keel's powerful planning tools.
        </p>
        <button
          onClick={onGetStarted}
          className="px-10 py-5 bg-white text-[#7c3aed] rounded-full text-lg font-medium hover:bg-gray-50 transition-all shadow-xl"
        >
          Try Keel Free for 7 Days
        </button>
      </div>
    </PageLayout>
  )
}

export default PlanningPage

