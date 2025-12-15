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
      <div className="text-center mb-20">
        <div className="inline-block bg-[#00d4ff]/10 text-[#00d4ff] text-sm font-semibold px-4 py-2 rounded-full mb-6">
          SECURITY
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#0a2540]">
          Bank Connections
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Securely connect your accounts to automatically import transactions.
        </p>
      </div>

      {/* Security Section */}
      <div className="bg-gradient-to-br from-[#f6f9fc] to-white rounded-3xl p-10 border border-gray-200 mb-16">
        <h2 className="text-3xl font-bold mb-8 text-[#0a2540]">Bank-Level Security</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            { icon: '🔐', title: 'Powered by Plaid', description: 'We use Plaid, the same technology trusted by Venmo, Robinhood, and thousands of other apps.' },
            { icon: '🔒', title: '256-bit Encryption', description: 'Your data is encrypted in transit and at rest using the same standards banks use.' },
            { icon: '🚫', title: 'We Never See Your Password', description: 'Your bank credentials go directly to Plaid. We never have access to them.' },
            { icon: '✅', title: 'Read-Only Access', description: 'We can only read your transactions. We cannot move money or make changes to your accounts.' },
          ].map((item, index) => (
            <div key={index} className="flex gap-4">
              <div className="text-3xl">{item.icon}</div>
              <div>
                <h3 className="font-bold mb-2 text-[#0a2540]">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supported Banks */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-6 text-[#0a2540]">10,000+ Supported Institutions</h2>
        <p className="text-gray-600 text-lg mb-8">
          We support virtually every bank, credit union, and financial institution in the US and Canada.
          Here are some of the most popular:
        </p>
        <div className="flex flex-wrap gap-3">
          {banks.map((bank, index) => (
            <span key={index} className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm font-medium">
              {bank}
            </span>
          ))}
          <span className="bg-[#635bff]/10 border border-[#635bff]/20 text-[#635bff] px-5 py-2.5 rounded-full text-sm font-semibold">
            + 10,000 more
          </span>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-3xl p-10 border border-gray-200 mb-20">
        <h2 className="text-3xl font-bold mb-8 text-[#0a2540]">How It Works</h2>
        <div className="space-y-8">
          {[
            { step: '1', title: 'Click "Connect Account"', description: 'From your dashboard, click the button to add a new account.' },
            { step: '2', title: 'Select Your Bank', description: 'Search for your bank and select it from the list.' },
            { step: '3', title: 'Log In Securely', description: 'Enter your bank credentials in Plaid\'s secure window. We never see this information.' },
            { step: '4', title: 'Transactions Import Automatically', description: 'Your transactions will start appearing in Keel within minutes.' },
          ].map((item, index) => (
            <div key={index} className="flex gap-5">
              <div className="w-10 h-10 bg-[#635bff] rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-bold mb-2 text-lg text-[#0a2540]">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-br from-[#635bff] to-[#00d4ff] rounded-3xl p-16 shadow-2xl">
        <h2 className="text-4xl font-bold mb-6 text-white">Ready to connect your accounts?</h2>
        <p className="text-white/90 text-lg mb-10 max-w-xl mx-auto">
          Start your free trial and link your accounts in minutes.
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

export default BankConnectionsPage

