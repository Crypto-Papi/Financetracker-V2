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
      <div className="text-center mb-16">
        <div className="inline-block bg-teal-500/20 text-teal-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          COMPARE
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Keel vs{' '}
          <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Simplifi
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Simplifi by Quicken is a solid budgeting app with a clean interface. 
          Here's how it stacks up against Keel.
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden mb-16">
        <div className="grid grid-cols-3 bg-gray-800 p-4 font-semibold">
          <div>Feature</div>
          <div className="text-center text-purple-400">Keel</div>
          <div className="text-center text-gray-400">Simplifi</div>
        </div>
        {comparisons.map((row, index) => (
          <div key={index} className={`grid grid-cols-3 p-4 ${index % 2 === 0 ? 'bg-gray-800/30' : ''}`}>
            <div className="text-gray-300">{row.feature}</div>
            <div className={`text-center ${row.keelWins === true ? 'text-green-400 font-semibold' : 'text-gray-300'}`}>
              {row.keel}
            </div>
            <div className={`text-center ${row.keelWins === false ? 'text-green-400 font-semibold' : 'text-gray-400'}`}>
              {row.competitor}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50 mb-16">
        <h2 className="text-2xl font-bold mb-4">The Bottom Line</h2>
        <p className="text-gray-400 mb-4">
          Simplifi is a well-designed app from the makers of Quicken. It offers solid budgeting features 
          and investment tracking, making it a good all-around choice.
        </p>
        <p className="text-gray-400">
          <strong className="text-white">Keel focuses on what matters most:</strong> tracking spending, 
          budgeting, and paying off debt. If you want a streamlined experience without the complexity 
          of investment tracking, Keel delivers at a lower monthly price.
        </p>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl p-12 border border-purple-500/30">
        <h2 className="text-3xl font-bold mb-4">Try Keel risk-free</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Start your 7-day free trial and experience the difference.
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

export default CompareSimplifiPage

