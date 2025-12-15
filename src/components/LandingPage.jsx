import { useEffect, useRef, useState } from 'react'

/**
 * Stripe-inspired Landing Page
 * Features: Modern design, flow animations, Stripe color scheme
 */
export function LandingPage({ onGetStarted, onSignIn, onNavigate }) {
  const [scrollY, setScrollY] = useState(0)
  const canvasRef = useRef(null)

  // Handle scroll for parallax effects
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Animated flow visualization (Stripe-style)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const particles = []
    let animationFrameId

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Create particles
    class Particle {
      constructor() {
        this.reset()
      }
      reset() {
        this.x = Math.random() * canvas.offsetWidth
        this.y = Math.random() * canvas.offsetHeight
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.radius = Math.random() * 2 + 1
        this.opacity = Math.random() * 0.5 + 0.2
      }
      update() {
        this.x += this.vx
        this.y += this.vy
        if (this.x < 0 || this.x > canvas.offsetWidth) this.vx *= -1
        if (this.y < 0 || this.y > canvas.offsetHeight) this.vy *= -1
      }
      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99, 91, 255, ${this.opacity})`
        ctx.fill()
      }
    }

    // Initialize particles
    for (let i = 0; i < 50; i++) {
      particles.push(new Particle())
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(99, 91, 255, ${0.1 * (1 - distance / 150)})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        })
      })

      // Update and draw particles
      particles.forEach(p => {
        p.update()
        p.draw()
      })

      animationFrameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  const features = [
    {
      icon: '💳',
      title: 'Smart Tracking',
      description: 'Automatically categorize and track every transaction in real-time.'
    },
    {
      icon: '📊',
      title: 'Visual Insights',
      description: 'Beautiful charts and graphs that make your finances crystal clear.'
    },
    {
      icon: '🎯',
      title: 'Goal Planning',
      description: 'Set financial goals and watch your progress with intelligent forecasting.'
    },
    {
      icon: '🔒',
      title: 'Bank-Level Security',
      description: 'Your data is encrypted and protected with industry-leading security.'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <img src="/keel-logo.png" alt="Keel" className="h-10 w-10" />
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <button onClick={() => onNavigate && onNavigate('tracking')} className="hover:text-gray-900 transition-colors">Features</button>
              <button onClick={() => onNavigate && onNavigate('about')} className="hover:text-gray-900 transition-colors">About</button>
              <button onClick={() => onNavigate && onNavigate('help')} className="hover:text-gray-900 transition-colors">Support</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onSignIn}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 bg-[#635bff] text-white text-sm font-medium rounded-full hover:bg-[#5851ea] transition-all shadow-sm hover:shadow-md"
            >
              Get started →
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden bg-gradient-to-b from-[#f6f9fc] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-[#0a2540] leading-tight tracking-tight">
              Financial clarity
              <br />
              <span className="bg-gradient-to-r from-[#635bff] to-[#00d4ff] bg-clip-text text-transparent">
                made simple
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Keel brings all your finances together in one beautiful dashboard. Track spending, manage budgets, and reach your goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-[#635bff] text-white text-lg font-medium rounded-full hover:bg-[#5851ea] transition-all shadow-lg hover:shadow-xl"
              >
                Start free trial
              </button>
              <button
                onClick={() => onNavigate && onNavigate('about')}
                className="px-8 py-4 text-[#635bff] text-lg font-medium hover:text-[#5851ea] transition-colors flex items-center gap-2"
              >
                Learn more
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
            <p className="mt-6 text-sm text-gray-500">Free 7-day trial • Cancel anytime</p>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#635bff]/10 rounded-full blur-3xl -z-10" style={{ transform: `translateY(${scrollY * 0.5}px)` }}></div>
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-[#00d4ff]/10 rounded-full blur-3xl -z-10" style={{ transform: `translateY(${scrollY * 0.3}px)` }}></div>
      </section>

      {/* Flow Visualization Section - Stripe Style */}
      <section className="relative py-32 px-6 bg-[#0a2540] overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-30"
        />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Modular financial solutions
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Every feature works together seamlessly to give you complete control over your money
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Track', desc: 'Monitor every dollar automatically', color: 'from-[#635bff] to-[#00d4ff]' },
              { title: 'Budget', desc: 'Smart budgets that adapt to you', color: 'from-[#00d4ff] to-[#7c3aed]' },
              { title: 'Grow', desc: 'Reach your financial goals faster', color: 'from-[#7c3aed] to-[#635bff]' }
            ].map((item, i) => (
              <div key={i} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl" style={{ background: `linear-gradient(to bottom right, ${item.color})` }}></div>
                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} mb-6 flex items-center justify-center text-2xl font-bold text-white`}>
                    {i + 1}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-[#0a2540] mb-6">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to make managing money effortless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl border border-gray-200 hover:border-[#635bff] hover:shadow-xl transition-all duration-300"
              >
                <div className="text-5xl mb-6">{feature.icon}</div>
                <h3 className="text-xl font-bold text-[#0a2540] mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-white to-[#f6f9fc]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-[#0a2540] mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start free. Scale as you grow.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="relative bg-white rounded-3xl p-10 border-2 border-[#635bff] shadow-2xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-[#635bff] to-[#00d4ff] text-white px-6 py-2 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-6xl font-bold text-[#0a2540]">$4.99</span>
                  <span className="text-gray-500 text-xl">/month</span>
                </div>
                <p className="text-gray-600">Billed monthly • Cancel anytime</p>
              </div>

              <ul className="space-y-4 mb-10">
                {[
                  'Unlimited transaction tracking',
                  'Smart budgeting tools',
                  'Visual insights & reports',
                  'Goal planning & forecasting',
                  'Bank-level security',
                  'Priority support'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-[#635bff] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={onGetStarted}
                className="w-full py-4 bg-[#635bff] text-white text-lg font-medium rounded-full hover:bg-[#5851ea] transition-all shadow-lg hover:shadow-xl"
              >
                Start 7-day free trial
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Cancel anytime, no questions asked
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-[#635bff] via-[#00d4ff] to-[#7c3aed] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Ready to transform your finances?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands who've taken control of their money with Keel. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="px-10 py-5 bg-white text-[#635bff] text-lg font-medium rounded-full hover:bg-gray-50 transition-all shadow-2xl hover:shadow-3xl"
            >
              Get started free
            </button>
            <button
              onClick={() => onNavigate && onNavigate('help')}
              className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white text-lg font-medium rounded-full hover:bg-white/20 transition-all border-2 border-white/20"
            >
              Contact sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 bg-[#0a2540] border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          {/* Footer Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
            {/* Logo Column */}
            <div className="col-span-2">
              <img src="/keel-logo.png" alt="Keel" className="h-10 w-10 mb-6" />
              <p className="text-gray-400 text-sm max-w-xs">
                The modern way to manage your finances. Track, budget, and grow your wealth.
              </p>
            </div>

            {/* Products Column */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Products</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => onNavigate && onNavigate('tracking')} className="text-gray-400 hover:text-white text-sm transition-colors">
                    Tracking
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate && onNavigate('budgeting')} className="text-gray-400 hover:text-white text-sm transition-colors">
                    Budgeting
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate && onNavigate('planning')} className="text-gray-400 hover:text-white text-sm transition-colors">
                    Planning
                  </button>
                </li>
              </ul>
            </div>

            {/* Developers Column */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Developers</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => onNavigate && onNavigate('bank-connections')} className="text-gray-400 hover:text-white text-sm transition-colors">
                    Documentation
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate && onNavigate('help')} className="text-gray-400 hover:text-white text-sm transition-colors">
                    API Reference
                  </button>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Company</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => onNavigate && onNavigate('about')} className="text-gray-400 hover:text-white text-sm transition-colors">
                    About
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate && onNavigate('blog')} className="text-gray-400 hover:text-white text-sm transition-colors">
                    Blog
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate && onNavigate('careers')} className="text-gray-400 hover:text-white text-sm transition-colors">
                    Careers
                  </button>
                </li>
              </ul>
            </div>

            {/* Support Column */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Support</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => onNavigate && onNavigate('help')} className="text-gray-400 hover:text-white text-sm transition-colors">
                    Help Center
                  </button>
                </li>
                <li>
                  <a href="mailto:support@keelfinance.com" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <button onClick={() => onNavigate && onNavigate('privacy')} className="text-gray-400 hover:text-white text-sm transition-colors">
                    Privacy
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate && onNavigate('terms')} className="text-gray-400 hover:text-white text-sm transition-colors">
                    Terms
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-gray-800">
            {/* Copyright */}
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Keel. All rights reserved.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-6">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage

