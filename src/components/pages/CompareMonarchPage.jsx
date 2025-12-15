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
      <div className="text-center mb-20">
        <div className="inline-block bg-[#7c3aed]/10 text-[#7c3aed] text-sm font-semibold px-4 py-2 rounded-full mb-6">
          COMPARE
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#0a2540] leading-tight">
          Keel vs{' '}
          <span className="bg-gradient-to-r from-[#7c3aed] to-[#00d4ff] bg-clip-text text-transparent">
            Monarch Money
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Monarch Money is a premium budgeting app with great features.
          Here's how Keel compares—and why we might be right for you.
        </p>
      </div>

      {/* Value Proposition */}
      <div className="bg-gradient-to-br from-[#00d4ff]/10 to-[#7c3aed]/10 border-2 border-[#00d4ff]/30 rounded-3xl p-8 mb-12">
        <div className="flex items-start gap-5">
          <span className="text-4xl">💰</span>
          <div>
            <h3 className="font-bold text-xl text-[#0a2540] mb-3">Save $120/year with Keel</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Keel costs just $49/year compared to Monarch's $99/year.
              That's 50% savings while getting the core features you need to manage your money.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden mb-16 shadow-lg">
        <div className="grid grid-cols-3 bg-[#f6f9fc] p-6 font-bold text-[#0a2540]">
          <div>Feature</div>
          <div className="text-center text-[#635bff]">Keel</div>
          <div className="text-center text-[#7c3aed]">Monarch</div>
        </div>
        {comparisons.map((row, index) => (
          <div key={index} className={`grid grid-cols-3 p-6 ${index % 2 === 0 ? 'bg-[#f6f9fc]/50' : 'bg-white'}`}>
            <div className="text-gray-700 font-medium">{row.feature}</div>
            <div className={`text-center ${row.keelWins === true ? 'text-[#00d4ff] font-bold' : row.keelWins === false ? 'text-gray-500' : 'text-gray-700'}`}>
              {row.keel}
            </div>
            <div className={`text-center ${row.keelWins === false ? 'text-[#00d4ff] font-bold' : row.keelWins === true ? 'text-gray-500' : 'text-gray-700'}`}>
              {row.competitor}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-3xl p-10 border border-gray-200 mb-16">
        <h2 className="text-3xl font-bold mb-8 text-[#0a2540]">Who Should Choose Keel?</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-[#00d4ff] font-bold text-lg mb-4">✓ Keel is for you if:</h3>
            <ul className="space-y-3 text-gray-600">
              <li>• You want powerful budgeting at a lower cost</li>
              <li>• Transaction tracking and budgets are your priority</li>
              <li>• You're focused on paying off debt</li>
              <li>• You prefer a simpler, focused interface</li>
            </ul>
          </div>
          <div>
            <h3 className="text-gray-700 font-bold text-lg mb-4">→ Consider Monarch if:</h3>
            <ul className="space-y-3 text-gray-600">
              <li>• You need investment portfolio tracking now</li>
              <li>• You want to share with a partner today</li>
              <li>• Net worth tracking is essential for you</li>
              <li>• You don't mind paying premium pricing</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div className="bg-gradient-to-br from-[#635bff]/10 to-[#7c3aed]/10 border-2 border-[#635bff]/30 rounded-3xl p-8 mb-20">
        <div className="flex items-start gap-5">
          <span className="text-4xl">🚀</span>
          <div>
            <h3 className="font-bold text-xl text-[#0a2540] mb-3">We're Building Fast</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Investment tracking, net worth, and family sharing are on our roadmap.
              Start with Keel today and get these features as we launch them—at no extra cost.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-br from-[#635bff] to-[#00d4ff] rounded-3xl p-16 shadow-2xl">
        <h2 className="text-4xl font-bold mb-6 text-white">Try Keel risk-free</h2>
        <p className="text-white/90 text-lg mb-10 max-w-xl mx-auto">
          See if Keel has everything you need. Start your 7-day free trial today.
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

export default CompareMonarchPage

