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
      <div className="text-center mb-20">
        <div className="inline-block bg-[#635bff]/10 text-[#635bff] text-sm font-semibold px-4 py-2 rounded-full mb-6">
          FEATURES
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#0a2540] leading-tight">
          Track Every Dollar,{' '}
          <span className="bg-gradient-to-r from-[#635bff] to-[#00d4ff] bg-clip-text text-transparent">
            Effortlessly
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          See all your money in one place. Keel automatically imports and categorizes your transactions
          so you always know where your money is going.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-20">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-[#635bff] hover:shadow-xl transition-all"
          >
            <div className="text-4xl mb-6">{feature.icon}</div>
            <h3 className="text-xl font-bold mb-3 text-[#0a2540]">{feature.title}</h3>
            <p className="text-gray-600 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-br from-[#635bff] to-[#00d4ff] rounded-3xl p-16 shadow-2xl">
        <h2 className="text-4xl font-bold mb-6 text-white">Ready to take control?</h2>
        <p className="text-white/90 text-lg mb-10 max-w-xl mx-auto">
          Start your 7-day free trial and see all your finances in one beautiful dashboard.
        </p>
        <button
          onClick={onGetStarted}
          className="px-10 py-5 bg-white text-[#635bff] rounded-full text-lg font-medium hover:bg-gray-50 transition-all shadow-xl"
        >
          Try Keel Free for 7 Days
        </button>
      </div>
    </PageLayout>
  )
}

export default TrackingPage

