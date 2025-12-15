/**
 * Reusable page layout component for footer pages
 * Stripe-inspired design with modern aesthetics
 */
export function PageLayout({ children, onBack, onNavigate }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Stripe Style */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/keel-logo.png" alt="Keel" className="h-8 w-8" />
            <span className="font-semibold text-lg text-[#0a2540]">Keel</span>
          </button>
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-[#635bff] transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
      </nav>

      {/* Main Content - Add padding for fixed nav */}
      <main className="max-w-5xl mx-auto px-6 py-24 pt-32">
        {children}
      </main>

      {/* Footer - Stripe Style */}
      <footer className="py-16 px-6 bg-[#f6f9fc] border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Keel. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            <button onClick={() => onNavigate && onNavigate('privacy')} className="text-gray-600 hover:text-[#635bff] text-sm transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => onNavigate && onNavigate('terms')} className="text-gray-600 hover:text-[#635bff] text-sm transition-colors">
              Terms of Use
            </button>
            <a href="mailto:support@keelfinance.com" className="text-gray-600 hover:text-[#635bff] text-sm transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PageLayout

