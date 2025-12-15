import { PageLayout } from './PageLayout'

/**
 * Comparison page - Keel vs Mint (RIP)
 */
export function CompareMintPage({ onBack, onNavigate, onGetStarted }) {
  const comparisons = [
    { feature: 'Status', keel: '✓ Active', competitor: '✗ Shut Down', keelWins: true },
    { feature: 'Monthly Price', keel: '$4.99/month', competitor: 'Was Free', keelWins: false },
    { feature: 'Ads', keel: '✗ No Ads', competitor: 'Many Ads', keelWins: true },
    { feature: 'Data Privacy', keel: '✓ Your data is yours', competitor: 'Data sold to advertisers', keelWins: true },
    { feature: 'Bank Connections', keel: '✓ Reliable', competitor: 'Often broken', keelWins: true },
    { feature: 'Customer Support', keel: '✓ Responsive', competitor: 'Limited', keelWins: true },
    { feature: 'Debt Payoff Planner', keel: '✓ Built-in', competitor: '✗ None', keelWins: true },
    { feature: 'Future Updates', keel: '✓ Active development', competitor: '✗ Discontinued', keelWins: true },
  ]

  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-block bg-green-500/20 text-green-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          COMPARE
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Keel vs{' '}
          <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Mint
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Mint was the go-to free budgeting app for years. After its shutdown in 2024, 
          many users are looking for a worthy replacement. Here's why Keel is the answer.
        </p>
      </div>

      {/* RIP Mint Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-yellow-400 mb-2">Mint Has Been Discontinued</h3>
            <p className="text-gray-400">
              Intuit shut down Mint in January 2024, leaving millions of users searching for alternatives. 
              Keel was built to fill that gap with a focus on simplicity, privacy, and reliability.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden mb-16">
        <div className="grid grid-cols-3 bg-gray-800 p-4 font-semibold">
          <div>Feature</div>
          <div className="text-center text-purple-400">Keel</div>
          <div className="text-center text-gray-400">Mint (RIP)</div>
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
        <h2 className="text-2xl font-bold mb-4">The Perfect Mint Replacement</h2>
        <p className="text-gray-400 mb-4">
          Mint was great for its time, but it came with trade-offs: ads everywhere, unreliable bank connections, 
          and your financial data being used for marketing purposes.
        </p>
        <p className="text-gray-400">
          <strong className="text-white">Keel is different.</strong> For less than the cost of a coffee per month, 
          you get a clean, ad-free experience with reliable bank connections and a team that's actively 
          improving the product. Your data stays yours.
        </p>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl p-12 border border-purple-500/30">
        <h2 className="text-3xl font-bold mb-4">Make the switch to Keel</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Join thousands of former Mint users who found their new home with Keel.
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

export default CompareMintPage

