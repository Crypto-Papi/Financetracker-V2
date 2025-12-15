/**
 * Reusable page layout component for footer pages
 * Provides consistent header, footer, and styling
 */
export function PageLayout({ children, onBack, onNavigate }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="px-6 py-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 hover:text-purple-400 transition-colors">
            <img src="/keel-logo.png" alt="Keel" className="h-10 w-10" />
            <span className="font-semibold text-lg">Keel</span>
          </button>
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Keel. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate && onNavigate('privacy')} className="text-gray-400 hover:text-white text-sm transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => onNavigate && onNavigate('terms')} className="text-gray-400 hover:text-white text-sm transition-colors">
              Terms of Use
            </button>
            <a href="mailto:support@keelfinance.com" className="text-gray-400 hover:text-white text-sm transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PageLayout

