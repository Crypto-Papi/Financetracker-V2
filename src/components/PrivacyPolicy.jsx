export function PrivacyPolicy({ onBack }) {
  return (
    <div className="min-h-screen bg-white text-gray-600">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/keel-logo.png" alt="Keel" className="h-10 w-10" />
            <span className="text-[#0a2540] font-semibold text-lg">Keel</span>
          </div>
          <button
            onClick={onBack}
            className="text-[#635bff] hover:text-[#5851ea] transition-colors cursor-pointer font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-24 pt-32">
        <h1 className="text-5xl font-bold text-[#0a2540] mb-4">Privacy Policy</h1>
        <p className="text-gray-500 mb-12 text-lg">Last updated: December 15, 2024</p>

        <div className="space-y-12">
          {/* Introduction */}
          <section>
            <h2 className="text-3xl font-bold text-[#0a2540] mb-4">1. Introduction</h2>
            <p className="text-lg leading-relaxed">
              Keel ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, disclose, and safeguard your information when you use our personal finance
              management application (the "Service").
            </p>
            <p className="mt-4 text-lg leading-relaxed">
              By using Keel, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-3xl font-bold text-[#0a2540] mb-4">2. Information We Collect</h2>

            <h3 className="text-2xl font-bold text-[#0a2540] mt-8 mb-4">2.1 Account Information</h3>
            <ul className="list-disc pl-6 space-y-3 text-lg">
              <li>Email address (for account creation and communication)</li>
              <li>Name (for personalization)</li>
              <li>Password (securely hashed, never stored in plain text)</li>
            </ul>

            <h3 className="text-2xl font-bold text-[#0a2540] mt-8 mb-4">2.2 Financial Data</h3>
            <p className="text-lg leading-relaxed">When you connect your bank accounts through our third-party provider Plaid, we may access:</p>
            <ul className="list-disc pl-6 space-y-3 mt-4 text-lg">
              <li>Account balances and types</li>
              <li>Transaction history (amounts, dates, merchant names, categories)</li>
              <li>Account and routing numbers (for account identification only)</li>
            </ul>
            <p className="mt-4 text-lg leading-relaxed">
              <strong className="text-[#0a2540]">Important:</strong> We never store your bank login credentials.
              Authentication is handled securely by Plaid.
            </p>

            <h3 className="text-2xl font-bold text-[#0a2540] mt-8 mb-4">2.3 Usage Data</h3>
            <ul className="list-disc pl-6 space-y-3 text-lg">
              <li>App usage patterns and feature interactions</li>
              <li>Device information and browser type</li>
              <li>Error logs for troubleshooting</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-3xl font-bold text-[#0a2540] mb-4">3. How We Use Your Information</h2>
            <p className="text-lg leading-relaxed">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-3 mt-4 text-lg">
              <li>Provide and maintain the Service</li>
              <li>Display your financial data and insights</li>
              <li>Process subscription payments via Stripe</li>
              <li>Send important account notifications</li>
              <li>Improve and optimize the Service</li>
              <li>Respond to customer support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-3xl font-bold text-[#0a2540] mb-4">4. Data Storage and Security</h2>
            <p className="text-lg leading-relaxed">We implement industry-standard security measures:</p>
            <ul className="list-disc pl-6 space-y-3 mt-4 text-lg">
              <li><strong className="text-[#0a2540]">Encryption in Transit:</strong> All data is transmitted using TLS 1.2 or higher</li>
              <li><strong className="text-[#0a2540]">Encryption at Rest:</strong> All stored data is encrypted using AES-256</li>
              <li><strong className="text-[#0a2540]">Cloud Infrastructure:</strong> Data is stored on Google Cloud Platform (Firebase) with SOC 2 Type II certification</li>
              <li><strong className="text-[#0a2540]">Access Controls:</strong> Strict authentication and authorization controls</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-3xl font-bold text-[#0a2540] mb-4">5. Third-Party Services</h2>
            <p className="text-lg leading-relaxed">We use trusted third-party services:</p>
            <ul className="list-disc pl-6 space-y-3 mt-4 text-lg">
              <li><strong className="text-[#0a2540]">Plaid:</strong> For secure bank account connections. See <a href="https://plaid.com/legal" target="_blank" rel="noopener noreferrer" className="text-[#635bff] hover:text-[#5851ea] font-medium">Plaid's Privacy Policy</a></li>
              <li><strong className="text-[#0a2540]">Stripe:</strong> For payment processing. See <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#635bff] hover:text-[#5851ea] font-medium">Stripe's Privacy Policy</a></li>
              <li><strong className="text-[#0a2540]">Firebase/Google Cloud:</strong> For data storage and authentication. See <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-[#635bff] hover:text-[#5851ea] font-medium">Firebase Privacy</a></li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-3xl font-bold text-[#0a2540] mb-4">6. Data Retention</h2>
            <p className="text-lg leading-relaxed">
              We retain your data for as long as your account is active. When you delete your account,
              we will delete your personal data within 30 days, except where we are required to retain
              it for legal or regulatory purposes.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-3xl font-bold text-[#0a2540] mb-4">7. Your Rights</h2>
            <p className="text-lg leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-3 mt-4 text-lg">
              <li><strong className="text-[#0a2540]">Access:</strong> Request a copy of your personal data</li>
              <li><strong className="text-[#0a2540]">Correction:</strong> Request correction of inaccurate data</li>
              <li><strong className="text-[#0a2540]">Deletion:</strong> Request deletion of your data</li>
              <li><strong className="text-[#0a2540]">Portability:</strong> Request your data in a portable format</li>
              <li><strong className="text-[#0a2540]">Disconnect:</strong> Revoke access to connected bank accounts at any time</li>
            </ul>
            <p className="mt-4 text-lg leading-relaxed">
              To exercise these rights, contact us at privacy@keelfinances.com
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-3xl font-bold text-[#0a2540] mb-4">8. Children's Privacy</h2>
            <p className="text-lg leading-relaxed">
              Keel is not intended for users under 18 years of age. We do not knowingly collect
              personal information from children. If you believe we have collected information from
              a child, please contact us immediately.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-3xl font-bold text-[#0a2540] mb-4">9. Changes to This Policy</h2>
            <p className="text-lg leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material
              changes by posting the new policy on this page and updating the "Last updated" date.
              Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-3xl font-bold text-[#0a2540] mb-4">10. Contact Us</h2>
            <p className="text-lg leading-relaxed">If you have questions about this Privacy Policy, please contact us:</p>
            <ul className="list-disc pl-6 space-y-3 mt-4 text-lg">
              <li>Email: privacy@keelfinances.com</li>
              <li>Website: https://keelfinances.com</li>
            </ul>
          </section>

          {/* California Residents */}
          <section>
            <h2 className="text-3xl font-bold text-[#0a2540] mb-4">11. California Residents (CCPA)</h2>
            <p className="text-lg leading-relaxed">
              If you are a California resident, you have additional rights under the California Consumer
              Privacy Act (CCPA), including the right to know what personal information we collect and
              how we use it, the right to delete your information, and the right to opt-out of the sale
              of your information. We do not sell your personal information.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-16 px-6 bg-[#f6f9fc] border-t border-gray-200 mt-20">
        <div className="max-w-4xl mx-auto text-center text-gray-500">
          © {new Date().getFullYear()} Keel. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

export default PrivacyPolicy

