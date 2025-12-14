import { useState, useEffect, useRef } from 'react'

/**
 * Landing page component similar to Monarch Money
 * Features: Hero with video background, features section, pricing, testimonials, CTA
 */
export function LandingPage({ onGetStarted, onSignIn }) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const videoRef = useRef(null)

  // Multiple video sources to cycle through for seamless experience - bright, daylight themes
  const videoSources = [
    'https://assets.mixkit.co/videos/33729/33729-720.mp4', // Family walking in the park - bright daylight
    'https://assets.mixkit.co/videos/33784/33784-720.mp4', // Parents playing with son in park - sunny
    'https://assets.mixkit.co/videos/4874/4874-720.mp4',   // Mother and daughter reading in park - sunny day
  ]

  // Cycle through videos when one ends
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleEnded = () => {
      setCurrentVideoIndex((prev) => (prev + 1) % videoSources.length)
    }

    video.addEventListener('ended', handleEnded)
    return () => video.removeEventListener('ended', handleEnded)
  }, [videoSources.length])

  // Load new video when index changes
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.load()
      video.play().catch(() => {}) // Ignore autoplay errors
    }
  }, [currentVideoIndex])

  const features = [
    {
      icon: '📊',
      title: 'Track Everything',
      description: 'See all your income and expenses in one place. Know exactly where your money goes each month.'
    },
    {
      icon: '💰',
      title: 'Smart Budgeting',
      description: 'Create flexible budgets that adapt to your lifestyle. Stay on track without the stress.'
    },
    {
      icon: '📈',
      title: 'Debt Payoff Planner',
      description: 'Visualize your path to becoming debt-free. Track progress and celebrate milestones.'
    },
    {
      icon: '🔄',
      title: 'Recurring Transactions',
      description: 'Never forget a bill again. Automatically track subscriptions and recurring expenses.'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero Section with Video Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onLoadedData={() => setIsVideoLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-50' : 'opacity-0'}`}
          >
            <source
              src={videoSources[currentVideoIndex]}
              type="video/mp4"
            />
          </video>
          {/* Gradient Overlay - darker to make text more readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900"></div>
        </div>

        {/* Navigation */}
        <nav className="absolute top-0 left-0 right-0 z-20 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <img src="/keel-logo.png" alt="Keel" className="h-14 w-14" />
            <div className="flex items-center gap-4">
              <button
                onClick={onSignIn}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={onGetStarted}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full font-semibold hover:from-purple-700 hover:to-blue-700 transition-all cursor-pointer"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            The modern way to
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"> manage money</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Keel helps you track spending, budget smarter, and reach your financial goals faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-purple-500/25 cursor-pointer"
            >
              Try Keel Free for 7 Days
            </button>
          </div>
          <p className="mt-4 text-gray-400 text-sm">No credit card required to start</p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* What is Keel Section */}
      <section className="py-20 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-purple-400 font-semibold mb-2">WHAT IS KEEL?</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Your home base for money clarity</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Keel simplifies your finances by bringing all your transactions together into one clear view. 
              Always know where your money is and where it's going.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need, all in one app</h2>
            <p className="text-gray-400 text-lg">Simple tools to take control of your financial life</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 hover:border-purple-500/50 transition-all hover:transform hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-purple-400 font-semibold mb-2">PRICING</p>
            <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400 text-lg">Start free, upgrade when you're ready</p>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-3xl p-8 md:p-12 border border-gray-700/50 max-w-lg mx-auto">
            <div className="text-center">
              <div className="inline-block bg-green-500/20 text-green-400 text-sm font-semibold px-4 py-1 rounded-full mb-4">
                7-day free trial
              </div>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-bold">$4.99</span>
                <span className="text-gray-400">/month</span>
              </div>
              <p className="text-gray-400 mb-8">Cancel anytime. No commitment.</p>

              <ul className="text-left space-y-4 mb-8">
                {['Unlimited transaction tracking', 'Smart budgeting tools', 'Debt payoff planner', 'Cash flow analysis', 'Recurring transaction management', 'Monthly auto-reset'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={onGetStarted}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all cursor-pointer"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to take control of your finances?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands of people who use Keel to track spending, budget smarter, and achieve their financial goals.
          </p>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-white text-purple-600 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all shadow-lg cursor-pointer"
          >
            Get Started Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img src="/keel-logo.png" alt="Keel" className="h-12 w-12" />
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Keel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage

