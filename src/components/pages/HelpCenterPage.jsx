import { PageLayout } from './PageLayout'

/**
 * Help Center page with FAQs
 */
export function HelpCenterPage({ onBack, onNavigate }) {
  const faqs = [
    {
      question: 'How do I connect my bank account?',
      answer: 'Go to the Accounts section in your dashboard and click "Connect Account". You\'ll be guided through our secure bank connection process powered by Plaid. We support over 10,000 financial institutions.'
    },
    {
      question: 'Is my financial data secure?',
      answer: 'Absolutely. We use bank-level encryption (256-bit SSL) to protect your data. We never store your bank login credentials—those are handled securely by Plaid. Your data is never sold or shared with third parties.'
    },
    {
      question: 'How do I cancel my subscription?',
      answer: 'You can cancel anytime from your account settings. Your subscription will remain active until the end of your current billing period. We don\'t offer refunds for partial months, but you\'ll keep access until your paid period ends.'
    },
    {
      question: 'What happens to my data if I cancel?',
      answer: 'Your data remains in your account for 30 days after cancellation. During this time, you can reactivate your subscription and pick up where you left off. After 30 days, your data is permanently deleted.'
    },
    {
      question: 'How does the monthly reset work?',
      answer: 'On the first of each month, Keel automatically clears your non-recurring transactions to give you a fresh start. Recurring transactions (like rent, subscriptions, etc.) are kept so you don\'t have to re-enter them.'
    },
    {
      question: 'Can I use Keel on multiple devices?',
      answer: 'Yes! Your Keel account works on any device with a web browser. Your data syncs automatically across all your devices.'
    },
    {
      question: 'How do I categorize transactions?',
      answer: 'Transactions are automatically categorized when imported from your bank. You can also manually categorize transactions or change categories by clicking on any transaction in your dashboard.'
    },
    {
      question: 'What is the debt payoff planner?',
      answer: 'The debt payoff planner helps you visualize your path to becoming debt-free. Add your debts, and Keel will show you when each will be paid off and how much interest you\'ll pay. You can use strategies like debt snowball or avalanche.'
    },
  ]

  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-block bg-blue-500/20 text-blue-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          SUPPORT
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Help Center
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Find answers to common questions about using Keel.
        </p>
      </div>

      {/* FAQs */}
      <div className="space-y-6 mb-16">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold mb-3">{faq.question}</h3>
            <p className="text-gray-400">{faq.answer}</p>
          </div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="text-center bg-gray-800/50 rounded-2xl p-12 border border-gray-700/50">
        <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
        <p className="text-gray-400 mb-6">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <a
          href="mailto:support@keelfinance.com"
          className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
        >
          Contact Support
        </a>
      </div>
    </PageLayout>
  )
}

export default HelpCenterPage

