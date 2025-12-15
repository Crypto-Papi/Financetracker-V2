import { PageLayout } from './PageLayout'

/**
 * Comparison page - Keel vs YNAB
 */
export function CompareYnabPage({ onBack, onNavigate, onGetStarted }) {
  const comparisons = [
    { feature: 'Monthly Price', keel: '$4.99/month', competitor: '$14.99/month', keelWins: true },
    { feature: 'Free Trial', keel: '7 days', competitor: '34 days', keelWins: false },
    { feature: 'Bank Connections', keel: '✓ Included', competitor: '✓ Included', keelWins: null },
    { feature: 'Automatic Categorization', keel: '✓ Yes', competitor: '✓ Yes', keelWins: null },
    { feature: 'Debt Payoff Planner', keel: '✓ Built-in', competitor: '✗ Limited', keelWins: true },
    { feature: 'Learning Curve', keel: 'Easy', competitor: 'Steep', keelWins: true },
    { feature: 'Mobile App', keel: '✓ Yes', competitor: '✓ Yes', keelWins: null },
    { feature: 'Recurring Transactions', keel: '✓ Auto-tracked', competitor: '✓ Scheduled', keelWins: null },
  ]

  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-block bg-orange-500/20 text-orange-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          COMPARE
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Keel vs{' '}
          <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            YNAB
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          YNAB is a powerful budgeting tool, but it comes with a steep learning curve and higher price. 
          See how Keel compares.
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden mb-16">
        <div className="grid grid-cols-3 bg-gray-800 p-4 font-semibold">
          <div>Feature</div>
          <div className="text-center text-purple-400">Keel</div>
          <div className="text-center text-gray-400">YNAB</div>
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
          YNAB is excellent for those who want to follow the zero-based budgeting methodology and don't mind 
          investing time to learn the system. However, at $14.99/month, it's one of the most expensive options.
        </p>
        <p className="text-gray-400">
          <strong className="text-white">Keel offers a simpler approach</strong> at a fraction of the cost. 
          If you want straightforward expense tracking, budgeting, and debt payoff planning without the 
          complexity, Keel is the better choice.
        </p>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl p-12 border border-purple-500/30">
        <h2 className="text-3xl font-bold mb-4">Try Keel risk-free</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Start your 7-day free trial and see why thousands are switching from YNAB to Keel.
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

export default CompareYnabPage

