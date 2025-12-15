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
      <div className="text-center mb-20">
        <div className="inline-block bg-[#635bff]/10 text-[#635bff] text-sm font-semibold px-4 py-2 rounded-full mb-6">
          CHANGELOG
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#0a2540]">
          What's New ✨
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          See the latest features and improvements we've shipped.
        </p>
      </div>

      {/* Updates Timeline */}
      <div className="space-y-6 mb-20">
        {updates.map((update, index) => (
          <div key={index} className="bg-white rounded-2xl p-10 border border-gray-200 hover:border-[#635bff] hover:shadow-lg transition-all">
            <div className="flex items-center gap-4 mb-6">
              <span className="bg-[#635bff]/10 text-[#635bff] text-sm font-mono font-semibold px-4 py-2 rounded-full">
                v{update.version}
              </span>
              <span className="text-gray-500 text-sm">{update.date}</span>
            </div>
            <h3 className="text-2xl font-bold mb-6 text-[#0a2540]">{update.title}</h3>
            <ul className="space-y-3">
              {update.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-600">
                  <svg className="w-6 h-6 text-[#00d4ff] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Coming Soon */}
      <div className="bg-gradient-to-br from-[#f6f9fc] to-white rounded-3xl p-10 border-2 border-dashed border-[#635bff]/30 mb-20">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-[#0a2540]">
          <span>🔮</span> Coming Soon
        </h3>
        <ul className="space-y-3 text-gray-600 text-lg">
          <li>• Investment tracking and net worth</li>
          <li>• Mobile app for iOS and Android</li>
          <li>• Shared budgets for couples and families</li>
          <li>• Custom reports and exports</li>
        </ul>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-br from-[#635bff] to-[#00d4ff] rounded-3xl p-16 shadow-2xl">
        <h2 className="text-4xl font-bold mb-6 text-white">Try the latest features</h2>
        <p className="text-white/90 text-lg mb-10 max-w-xl mx-auto">
          Start your free trial and experience everything Keel has to offer.
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

export default WhatsNewPage

