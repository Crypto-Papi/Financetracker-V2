import { PageLayout } from './PageLayout'

/**
 * Terms of Use page
 */
export function TermsPage({ onBack, onNavigate }) {
  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-4 text-[#0a2540]">Terms of Use</h1>
        <p className="text-gray-500 mb-12 text-lg">Last updated: December 2024</p>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4 text-[#0a2540]">1. Acceptance of Terms</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            By accessing or using Keel ("the Service"), you agree to be bound by these Terms of Use.
            If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4 text-[#0a2540]">2. Description of Service</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Keel is a personal finance management application that helps users track expenses,
            create budgets, and manage their financial goals. The Service may include features
            such as bank account linking, transaction categorization, and financial reporting.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4 text-[#0a2540]">3. Account Registration</h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-4">
            To use certain features of the Service, you must create an account. You agree to:
          </p>
          <ul className="list-disc list-inside text-gray-600 text-lg space-y-2 ml-4">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4 text-[#0a2540]">4. Subscription and Billing</h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-4">
            Keel offers a subscription-based service. By subscribing, you agree to:
          </p>
          <ul className="list-disc list-inside text-gray-600 text-lg space-y-2 ml-4">
            <li>Pay the applicable subscription fees</li>
            <li>Automatic renewal unless cancelled before the renewal date</li>
            <li>Provide valid payment information</li>
          </ul>
          <p className="text-gray-600 text-lg leading-relaxed mt-4">
            You may cancel your subscription at any time. Cancellation will take effect at the end
            of your current billing period.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4 text-[#0a2540]">5. Acceptable Use</h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-4">You agree not to:</p>
          <ul className="list-disc list-inside text-gray-600 text-lg space-y-2 ml-4">
            <li>Use the Service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to the Service</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Share your account with others</li>
            <li>Reverse engineer or attempt to extract source code</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4 text-[#0a2540]">6. Financial Information Disclaimer</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Keel is a tool for personal finance management and does not provide financial advice.
            The information provided through the Service is for informational purposes only and
            should not be considered financial, investment, or tax advice. Always consult with
            qualified professionals for financial decisions.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4 text-[#0a2540]">7. Limitation of Liability</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            To the maximum extent permitted by law, Keel shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages resulting from your use of
            the Service.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4 text-[#0a2540]">8. Changes to Terms</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            We reserve the right to modify these Terms at any time. We will notify users of
            significant changes via email or through the Service. Continued use after changes
            constitutes acceptance of the new Terms.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4 text-[#0a2540]">9. Contact Us</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            If you have questions about these Terms, please contact us at{' '}
            <a href="mailto:support@keelfinance.com" className="text-[#635bff] hover:text-[#5851ea] font-medium">
              support@keelfinance.com
            </a>
          </p>
        </section>
      </div>
    </PageLayout>
  )
}

export default TermsPage

