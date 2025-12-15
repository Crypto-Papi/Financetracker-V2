import { PageLayout } from './PageLayout'

/**
 * What's New page - changelog and updates
 */
export function WhatsNewPage({ onBack, onNavigate, onGetStarted }) {
  const updates = [
    {
      version: '1.2.0',
      date: 'December 2024',
      title: 'Bank Connections & Plaid Integration',
      features: [
        'Connect your bank accounts securely with Plaid',
        'Automatic transaction import from connected accounts',
        'Sync button to refresh account data',
        'Disconnect accounts when no longer needed'
      ]
    },
    {
      version: '1.1.0',
      date: 'November 2024',
      title: 'Debt Payoff Planner',
      features: [
        'Track all your debts in one place',
        'Visualize your debt-free date',
        'Celebrate milestones with confetti animations',
        'Support for snowball and avalanche strategies'
      ]
    },
    {
      version: '1.0.0',
      date: 'October 2024',
      title: 'Initial Launch',
      features: [
        'Transaction tracking with categories',
        'Monthly budgeting tools',
        'Recurring transaction management',
        'Automatic monthly reset',
        'Cash flow analysis'
      ]
    },
  ]

  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-block bg-yellow-500/20 text-yellow-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          CHANGELOG
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          What's New ✨
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          See the latest features and improvements we've shipped.
        </p>
      </div>

      {/* Updates Timeline */}
      <div className="space-y-8 mb-16">
        {updates.map((update, index) => (
          <div key={index} className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50">
            <div className="flex items-center gap-4 mb-4">
              <span className="bg-purple-500/20 text-purple-400 text-sm font-mono px-3 py-1 rounded">
                v{update.version}
              </span>
              <span className="text-gray-500 text-sm">{update.date}</span>
            </div>
            <h3 className="text-xl font-semibold mb-4">{update.title}</h3>
            <ul className="space-y-2">
              {update.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-400">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Coming Soon */}
      <div className="bg-gray-800/30 rounded-2xl p-8 border border-dashed border-gray-600 mb-16">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>🔮</span> Coming Soon
        </h3>
        <ul className="space-y-2 text-gray-400">
          <li>• Investment tracking and net worth</li>
          <li>• Mobile app for iOS and Android</li>
          <li>• Shared budgets for couples and families</li>
          <li>• Custom reports and exports</li>
        </ul>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl p-12 border border-purple-500/30">
        <h2 className="text-3xl font-bold mb-4">Try the latest features</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Start your free trial and experience everything Keel has to offer.
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

export default WhatsNewPage

