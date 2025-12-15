import { PageLayout } from './PageLayout'

/**
 * Careers page
 */
export function CareersPage({ onBack, onNavigate }) {
  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-20">
        <div className="inline-block bg-[#7c3aed]/10 text-[#7c3aed] text-sm font-semibold px-4 py-2 rounded-full mb-6">
          CAREERS
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#0a2540]">
          Join the Keel Team
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Help us build the future of personal finance.
        </p>
      </div>

      {/* Why Join Section */}
      <div className="bg-gradient-to-br from-[#f6f9fc] to-white rounded-3xl p-10 border border-gray-200 mb-16">
        <h2 className="text-3xl font-bold mb-8 text-[#0a2540]">Why Work at Keel?</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            { icon: '🌍', title: 'Remote First', description: 'Work from anywhere in the world. We believe great work happens when you\'re comfortable.' },
            { icon: '💰', title: 'Competitive Pay', description: 'We offer competitive salaries and equity so you share in our success.' },
            { icon: '🏖️', title: 'Unlimited PTO', description: 'Take the time you need to recharge. We trust you to manage your schedule.' },
            { icon: '📚', title: 'Learning Budget', description: 'Annual budget for courses, books, and conferences to help you grow.' },
          ].map((perk, index) => (
            <div key={index} className="flex gap-4">
              <div className="text-3xl">{perk.icon}</div>
              <div>
                <h3 className="font-bold mb-2 text-[#0a2540]">{perk.title}</h3>
                <p className="text-gray-600">{perk.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open Positions */}
      <div className="mb-20">
        <h2 className="text-3xl font-bold mb-8 text-[#0a2540]">Open Positions</h2>

        <div className="bg-white border-2 border-gray-200 rounded-3xl p-12 text-center">
          <span className="text-5xl mb-6 block">🚀</span>
          <h3 className="text-2xl font-bold mb-4 text-[#0a2540]">No Open Positions Right Now</h3>
          <p className="text-gray-600 text-lg mb-8">
            We're not actively hiring at the moment, but we're always interested in meeting talented people.
          </p>
          <a
            href="mailto:careers@keelfinance.com"
            className="inline-block px-8 py-4 bg-[#635bff] text-white hover:bg-[#5851ea] rounded-full transition-colors font-medium"
          >
            Send Us Your Resume
          </a>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-gradient-to-br from-[#635bff] to-[#00d4ff] rounded-3xl p-16 shadow-2xl">
        <h2 className="text-3xl font-bold mb-10 text-center text-white">Our Values</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {[
            { title: 'User First', description: 'Every decision starts with "How does this help our users?"' },
            { title: 'Ship Fast', description: 'We move quickly and iterate based on feedback.' },
            { title: 'Stay Humble', description: 'We\'re always learning and open to being wrong.' },
          ].map((value, index) => (
            <div key={index}>
              <h3 className="font-bold text-lg mb-3 text-white">{value.title}</h3>
              <p className="text-white/90">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}

export default CareersPage

