import { PageLayout } from './PageLayout'

/**
 * Bank Connections page - explains Plaid integration and security
 */
export function BankConnectionsPage({ onBack, onNavigate, onGetStarted }) {
  const banks = [
    'Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One',
    'US Bank', 'PNC', 'TD Bank', 'Ally', 'Discover', 'American Express',
    'Navy Federal', 'USAA', 'Charles Schwab', 'Fidelity', 'Vanguard'
  ]

  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-block bg-blue-500/20 text-blue-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          SECURITY
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Bank Connections
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Securely connect your accounts to automatically import transactions.
        </p>
      </div>

      {/* Security Section */}
      <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50 mb-12">
        <h2 className="text-2xl font-bold mb-6">Bank-Level Security</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: '🔐', title: 'Powered by Plaid', description: 'We use Plaid, the same technology trusted by Venmo, Robinhood, and thousands of other apps.' },
            { icon: '🔒', title: '256-bit Encryption', description: 'Your data is encrypted in transit and at rest using the same standards banks use.' },
            { icon: '🚫', title: 'We Never See Your Password', description: 'Your bank credentials go directly to Plaid. We never have access to them.' },
            { icon: '✅', title: 'Read-Only Access', description: 'We can only read your transactions. We cannot move money or make changes to your accounts.' },
          ].map((item, index) => (
            <div key={index} className="flex gap-4">
              <div className="text-2xl">{item.icon}</div>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supported Banks */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">10,000+ Supported Institutions</h2>
        <p className="text-gray-400 mb-6">
          We support virtually every bank, credit union, and financial institution in the US and Canada. 
          Here are some of the most popular:
        </p>
        <div className="flex flex-wrap gap-3">
          {banks.map((bank, index) => (
            <span key={index} className="bg-gray-800 text-gray-300 px-4 py-2 rounded-full text-sm">
              {bank}
            </span>
          ))}
          <span className="bg-gray-700 text-gray-400 px-4 py-2 rounded-full text-sm">
            + 10,000 more
          </span>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50 mb-16">
        <h2 className="text-2xl font-bold mb-6">How It Works</h2>
        <div className="space-y-6">
          {[
            { step: '1', title: 'Click "Connect Account"', description: 'From your dashboard, click the button to add a new account.' },
            { step: '2', title: 'Select Your Bank', description: 'Search for your bank and select it from the list.' },
            { step: '3', title: 'Log In Securely', description: 'Enter your bank credentials in Plaid\'s secure window. We never see this information.' },
            { step: '4', title: 'Transactions Import Automatically', description: 'Your transactions will start appearing in Keel within minutes.' },
          ].map((item, index) => (
            <div key={index} className="flex gap-4">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl p-12 border border-purple-500/30">
        <h2 className="text-3xl font-bold mb-4">Ready to connect your accounts?</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Start your free trial and link your accounts in minutes.
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

export default BankConnectionsPage

