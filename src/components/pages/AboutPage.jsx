import { PageLayout } from './PageLayout'

/**
 * About page - Company mission and story
 */
export function AboutPage({ onBack, onNavigate, onGetStarted }) {
  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-20">
        <div className="inline-block bg-[#635bff]/10 text-[#635bff] text-sm font-semibold px-4 py-2 rounded-full mb-6">
          ABOUT US
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#0a2540] leading-tight">
          Money management for{' '}
          <span className="bg-gradient-to-r from-[#635bff] to-[#00d4ff] bg-clip-text text-transparent">
            real people
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          We believe everyone deserves financial clarity without complexity.
        </p>
      </div>

      {/* Mission Section */}
      <div className="bg-gradient-to-br from-[#f6f9fc] to-white rounded-3xl p-10 border border-gray-200 mb-16">
        <h2 className="text-3xl font-bold mb-6 text-[#0a2540]">Our Mission</h2>
        <p className="text-gray-600 text-lg leading-relaxed">
          Keel exists to help people take control of their finances without the stress. We believe that
          understanding where your money goes shouldn't require a finance degree or hours of spreadsheet work.
          Our goal is to make personal finance simple, accessible, and even enjoyable.
        </p>
      </div>

      {/* Story Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-[#0a2540]">Our Story</h2>
        <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
          <p>
            Keel was born out of frustration. Like many people, we tried every budgeting app out there.
            Some were too complicated, requiring hours to set up and maintain. Others were free but
            plastered with ads and sold our data. And when Mint shut down, millions of users were left
            searching for something better.
          </p>
          <p>
            We decided to build the app we always wanted: one that's simple enough to use daily,
            powerful enough to actually help, and priced fairly so everyone can afford it.
          </p>
          <p>
            The name "Keel" comes from the part of a boat that provides stability and keeps it on course.
            That's exactly what we want to do for your finances—help you stay balanced and moving in the
            right direction.
          </p>
        </div>
      </div>

      {/* Values Section */}
      <div className="mb-20">
        <h2 className="text-3xl font-bold mb-10 text-[#0a2540]">What We Believe</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: '🎯', title: 'Simplicity First', description: 'If it\'s not easy to use, people won\'t use it. We obsess over making Keel intuitive.' },
            { icon: '🔒', title: 'Privacy Matters', description: 'Your financial data is yours. We don\'t sell it, share it, or use it for ads.' },
            { icon: '💰', title: 'Fair Pricing', description: 'Great software doesn\'t have to cost a fortune. We keep our prices accessible.' },
            { icon: '🚀', title: 'Always Improving', description: 'We ship updates regularly based on what our users actually need.' },
          ].map((value, index) => (
            <div key={index} className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-[#635bff] hover:shadow-lg transition-all">
              <div className="text-3xl mb-4">{value.icon}</div>
              <h3 className="font-bold text-lg mb-3 text-[#0a2540]">{value.title}</h3>
              <p className="text-gray-600">{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-br from-[#635bff] to-[#00d4ff] rounded-3xl p-16 shadow-2xl">
        <h2 className="text-4xl font-bold mb-6 text-white">Join us on the journey</h2>
        <p className="text-white/90 text-lg mb-10 max-w-xl mx-auto">
          Start your free trial and see why thousands trust Keel with their finances.
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

export default AboutPage

