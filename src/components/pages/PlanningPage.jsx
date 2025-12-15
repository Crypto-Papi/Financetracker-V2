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
      <div className="text-center mb-16">
        <div className="inline-block bg-blue-500/20 text-blue-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          FEATURES
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Plan Your Financial{' '}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Future
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          From paying off debt to building wealth, Keel helps you create a roadmap 
          to achieve your financial dreams.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50 hover:border-blue-500/50 transition-all"
          >
            <div className="text-3xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-400">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-3xl p-12 border border-blue-500/30">
        <h2 className="text-3xl font-bold mb-4">Start planning your future</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Take the first step toward financial freedom with Keel's powerful planning tools.
        </p>
        <button
          onClick={onGetStarted}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full text-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all cursor-pointer"
        >
          Try Keel Free for 7 Days
        </button>
      </div>
    </PageLayout>
  )
}

export default PlanningPage

