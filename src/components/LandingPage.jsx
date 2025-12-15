import { useState, useEffect, useRef } from 'react'

/**
 * Landing page component similar to Monarch Money
 * Features: Hero with video background, features section, pricing, testimonials, CTA
 */
export function LandingPage({ onGetStarted, onSignIn, onNavigate }) {
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

  // Smooth scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

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
          <p className="mt-4 text-gray-400 text-sm">7-day free trial • Cancel anytime</p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* What is Keel Section */}
      <section id="about" className="py-20 px-6 bg-gray-900">
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
      <section id="features" className="py-20 px-6 bg-gray-800/50">
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
      <section id="pricing" className="py-20 px-6 bg-gray-900">
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
      <footer className="py-16 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          {/* Footer Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
            {/* Logo Column */}
            <div className="col-span-2 md:col-span-1">
              <img src="/keel-logo.png" alt="Keel" className="h-12 w-12 mb-4" />
            </div>

            {/* Features Column */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Features</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    Tracking
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    Budgeting
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    Planning
                  </button>
                </li>
              </ul>
            </div>

            {/* Compare Column */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Compare</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    YNAB
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    Simplifi
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    Mint
                  </button>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors flex items-center gap-1">
                    What's New <span className="text-purple-500">✨</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    Bank Connections
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate && onNavigate('privacy')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => scrollToSection('about')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    About
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('about')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    Blog
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('about')} className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    Careers
                  </button>
                </li>
              </ul>
            </div>

            {/* Support Column */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-3">
                <li>
                  <a href="mailto:support@keelfinance.com" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="mailto:support@keelfinance.com" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-gray-200">
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>

            {/* Copyright */}
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

