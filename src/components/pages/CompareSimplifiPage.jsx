import { PageLayout } from './PageLayout'

/**
 * Comparison page - Keel vs Simplifi
 */
export function CompareSimplifiPage({ onBack, onNavigate, onGetStarted }) {
  const comparisons = [
    { feature: 'Monthly Price', keel: '$4.99/month', competitor: '$5.99/month', keelWins: true },
    { feature: 'Annual Price', keel: '$49.99/year', competitor: '$47.99/year', keelWins: false },
    { feature: 'Free Trial', keel: '7 days', competitor: '30 days', keelWins: false },
    { feature: 'Bank Connections', keel: '✓ Included', competitor: '✓ Included', keelWins: null },
    { feature: 'Debt Payoff Planner', keel: '✓ Built-in', competitor: '✗ Basic', keelWins: true },
    { feature: 'Spending Reports', keel: '✓ Yes', competitor: '✓ Yes', keelWins: null },
    { feature: 'Bill Tracking', keel: '✓ Recurring', competitor: '✓ Calendar', keelWins: null },
    { feature: 'Investment Tracking', keel: '✗ Coming Soon', competitor: '✓ Yes', keelWins: false },
  ]

  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-20">
        <div className="inline-block bg-[#00d4ff]/10 text-[#00d4ff] text-sm font-semibold px-4 py-2 rounded-full mb-6">
          COMPARE
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#0a2540] leading-tight">
          Keel vs{' '}
          <span className="bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] bg-clip-text text-transparent">
            Simplifi
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Simplifi by Quicken is a solid budgeting app with a clean interface.
          Here's how it stacks up against Keel.
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden mb-16 shadow-lg">
        <div className="grid grid-cols-3 bg-[#f6f9fc] p-6 font-bold text-[#0a2540]">
          <div>Feature</div>
          <div className="text-center text-[#635bff]">Keel</div>
          <div className="text-center text-gray-600">Simplifi</div>
        </div>
        {comparisons.map((row, index) => (
          <div key={index} className={`grid grid-cols-3 p-6 ${index % 2 === 0 ? 'bg-[#f6f9fc]/50' : 'bg-white'}`}>
            <div className="text-gray-700 font-medium">{row.feature}</div>
            <div className={`text-center ${row.keelWins === true ? 'text-[#00d4ff] font-bold' : 'text-gray-700'}`}>
              {row.keel}
            </div>
            <div className={`text-center ${row.keelWins === false ? 'text-[#00d4ff] font-bold' : 'text-gray-500'}`}>
              {row.competitor}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-br from-[#f6f9fc] to-white rounded-3xl p-10 border border-gray-200 mb-20">
        <h2 className="text-3xl font-bold mb-6 text-[#0a2540]">The Bottom Line</h2>
        <p className="text-gray-600 text-lg mb-6 leading-relaxed">
          Simplifi is a well-designed app from the makers of Quicken. It offers solid budgeting features
          and investment tracking, making it a good all-around choice.
        </p>
        <p className="text-gray-600 text-lg leading-relaxed">
          <strong className="text-[#0a2540]">Keel focuses on what matters most:</strong> tracking spending,
          budgeting, and paying off debt. If you want a streamlined experience without the complexity
          of investment tracking, Keel delivers at a lower monthly price.
        </p>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-br from-[#635bff] to-[#00d4ff] rounded-3xl p-16 shadow-2xl">
        <h2 className="text-4xl font-bold mb-6 text-white">Try Keel risk-free</h2>
        <p className="text-white/90 text-lg mb-10 max-w-xl mx-auto">
          Start your 7-day free trial and experience the difference.
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

export default CompareSimplifiPage

