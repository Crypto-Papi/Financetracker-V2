import { PageLayout } from './PageLayout'

/**
 * Careers page
 */
export function CareersPage({ onBack, onNavigate }) {
  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-block bg-green-500/20 text-green-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          CAREERS
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Join the Keel Team
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Help us build the future of personal finance.
        </p>
      </div>

      {/* Why Join Section */}
      <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50 mb-12">
        <h2 className="text-2xl font-bold mb-6">Why Work at Keel?</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: '🌍', title: 'Remote First', description: 'Work from anywhere in the world. We believe great work happens when you\'re comfortable.' },
            { icon: '💰', title: 'Competitive Pay', description: 'We offer competitive salaries and equity so you share in our success.' },
            { icon: '🏖️', title: 'Unlimited PTO', description: 'Take the time you need to recharge. We trust you to manage your schedule.' },
            { icon: '📚', title: 'Learning Budget', description: 'Annual budget for courses, books, and conferences to help you grow.' },
          ].map((perk, index) => (
            <div key={index} className="flex gap-4">
              <div className="text-2xl">{perk.icon}</div>
              <div>
                <h3 className="font-semibold mb-1">{perk.title}</h3>
                <p className="text-gray-400 text-sm">{perk.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open Positions */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Open Positions</h2>
        
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-8 text-center">
          <span className="text-4xl mb-4 block">🚀</span>
          <h3 className="text-xl font-semibold mb-2">No Open Positions Right Now</h3>
          <p className="text-gray-400 mb-6">
            We're not actively hiring at the moment, but we're always interested in meeting talented people.
          </p>
          <a
            href="mailto:careers@keelfinance.com"
            className="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
          >
            Send Us Your Resume
          </a>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl p-12 border border-purple-500/30">
        <h2 className="text-2xl font-bold mb-6 text-center">Our Values</h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          {[
            { title: 'User First', description: 'Every decision starts with "How does this help our users?"' },
            { title: 'Ship Fast', description: 'We move quickly and iterate based on feedback.' },
            { title: 'Stay Humble', description: 'We\'re always learning and open to being wrong.' },
          ].map((value, index) => (
            <div key={index}>
              <h3 className="font-semibold mb-2">{value.title}</h3>
              <p className="text-gray-400 text-sm">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}

export default CareersPage

