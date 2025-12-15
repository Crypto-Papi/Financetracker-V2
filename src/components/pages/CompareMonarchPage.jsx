import { PageLayout } from './PageLayout'

/**
 * Comparison page - Keel vs Monarch Money
 */
export function CompareMonarchPage({ onBack, onNavigate, onGetStarted }) {
  const comparisons = [
    { feature: 'Monthly Price', keel: '$4.99/month', competitor: '$14.99/month', keelWins: true },
    { feature: 'Annual Price', keel: '$49/year', competitor: '$99/year', keelWins: true },
    { feature: 'Free Trial', keel: '7 days', competitor: '7 days', keelWins: null },
    { feature: 'Bank Connections', keel: '✓ 12,000+', competitor: '✓ 11,000+', keelWins: true },
    { feature: 'Transaction Tracking', keel: '✓ Automatic', competitor: '✓ Automatic', keelWins: null },
    { feature: 'Budgeting', keel: '✓ Flexible', competitor: '✓ Flexible', keelWins: null },
    { feature: 'Debt Payoff Planner', keel: '✓ Built-in', competitor: '✓ Built-in', keelWins: null },
    { feature: 'Recurring Transactions', keel: '✓ Included', competitor: '✓ Included', keelWins: null },
    { feature: 'Investment Tracking', keel: 'Coming Soon', competitor: '✓ Included', keelWins: false },
    { feature: 'Net Worth', keel: 'Coming Soon', competitor: '✓ Included', keelWins: false },
    { feature: 'Couples/Family Sharing', keel: 'Coming Soon', competitor: '✓ Included', keelWins: false },
  ]

  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-block bg-yellow-500/20 text-yellow-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          COMPARE
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Keel vs{' '}
          <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Monarch Money
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Monarch Money is a premium budgeting app with great features. 
          Here's how Keel compares—and why we might be right for you.
        </p>
      </div>

      {/* Value Proposition */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <span className="text-2xl">💰</span>
          <div>
            <h3 className="font-semibold text-green-400 mb-2">Save $120/year with Keel</h3>
            <p className="text-gray-400">
              Keel costs just $49/year compared to Monarch's $99/year. 
              That's 50% savings while getting the core features you need to manage your money.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden mb-16">
        <div className="grid grid-cols-3 bg-gray-800 p-4 font-semibold">
          <div>Feature</div>
          <div className="text-center text-purple-400">Keel</div>
          <div className="text-center text-yellow-400">Monarch</div>
        </div>
        {comparisons.map((row, index) => (
          <div key={index} className={`grid grid-cols-3 p-4 ${index % 2 === 0 ? 'bg-gray-800/30' : ''}`}>
            <div className="text-gray-300">{row.feature}</div>
            <div className={`text-center ${row.keelWins === true ? 'text-green-400 font-semibold' : row.keelWins === false ? 'text-gray-400' : 'text-gray-300'}`}>
              {row.keel}
            </div>
            <div className={`text-center ${row.keelWins === false ? 'text-green-400 font-semibold' : row.keelWins === true ? 'text-gray-400' : 'text-gray-300'}`}>
              {row.competitor}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50 mb-16">
        <h2 className="text-2xl font-bold mb-4">Who Should Choose Keel?</h2>
        <div className="grid md:grid-cols-2 gap-6 text-gray-400">
          <div>
            <h3 className="text-white font-semibold mb-2">✓ Keel is for you if:</h3>
            <ul className="space-y-2 text-sm">
              <li>• You want powerful budgeting at a lower cost</li>
              <li>• Transaction tracking and budgets are your priority</li>
              <li>• You're focused on paying off debt</li>
              <li>• You prefer a simpler, focused interface</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">→ Consider Monarch if:</h3>
            <ul className="space-y-2 text-sm">
              <li>• You need investment portfolio tracking now</li>
              <li>• You want to share with a partner today</li>
              <li>• Net worth tracking is essential for you</li>
              <li>• You don't mind paying premium pricing</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 mb-16">
        <div className="flex items-start gap-4">
          <span className="text-2xl">🚀</span>
          <div>
            <h3 className="font-semibold text-purple-400 mb-2">We're Building Fast</h3>
            <p className="text-gray-400">
              Investment tracking, net worth, and family sharing are on our roadmap. 
              Start with Keel today and get these features as we launch them—at no extra cost.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl p-12 border border-purple-500/30">
        <h2 className="text-3xl font-bold mb-4">Try Keel risk-free</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          See if Keel has everything you need. No credit card required to start.
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

export default CompareMonarchPage

