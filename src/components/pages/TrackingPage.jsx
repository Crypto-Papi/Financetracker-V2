import { PageLayout } from './PageLayout'

/**
 * Tracking feature page - explains transaction tracking capabilities
 */
export function TrackingPage({ onBack, onNavigate, onGetStarted }) {
  const features = [
    {
      icon: '🔗',
      title: 'Connect All Your Accounts',
      description: 'Link your bank accounts, credit cards, and investment accounts in one place. Keel securely connects to over 10,000 financial institutions.'
    },
    {
      icon: '📊',
      title: 'Automatic Categorization',
      description: 'Transactions are automatically categorized so you can see exactly where your money goes. Customize categories to match your lifestyle.'
    },
    {
      icon: '📱',
      title: 'Real-Time Updates',
      description: 'See your transactions as they happen. No more waiting days to know where you stand financially.'
    },
    {
      icon: '🔍',
      title: 'Powerful Search & Filters',
      description: 'Find any transaction instantly. Filter by date, category, account, or amount to get the insights you need.'
    },
    {
      icon: '📈',
      title: 'Spending Trends',
      description: 'Visualize your spending patterns over time. Identify trends and make smarter financial decisions.'
    },
    {
      icon: '🔔',
      title: 'Smart Alerts',
      description: 'Get notified about large transactions, unusual spending, or when you\'re approaching budget limits.'
    }
  ]

  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-block bg-purple-500/20 text-purple-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          FEATURES
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Track Every Dollar,{' '}
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Effortlessly
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          See all your money in one place. Keel automatically imports and categorizes your transactions 
          so you always know where your money is going.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50 hover:border-purple-500/50 transition-all"
          >
            <div className="text-3xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-400">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl p-12 border border-purple-500/30">
        <h2 className="text-3xl font-bold mb-4">Ready to take control?</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Start your 7-day free trial and see all your finances in one beautiful dashboard.
        </p>
        <button
          onClick={onGetStarted}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all cursor-pointer"
        >
          Try Keel Free for 7 Days
        </button>
      </div>
    </PageLayout>
  )
}

export default TrackingPage

