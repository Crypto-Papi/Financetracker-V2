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
      <div className="text-center mb-20">
        <div className="inline-block bg-[#00d4ff]/10 text-[#00d4ff] text-sm font-semibold px-4 py-2 rounded-full mb-6">
          SUPPORT
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#0a2540]">
          Help Center
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Find answers to common questions about using Keel.
        </p>
      </div>

      {/* FAQs */}
      <div className="space-y-4 mb-20">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#635bff] hover:shadow-lg transition-all">
            <h3 className="text-lg font-bold mb-4 text-[#0a2540]">{faq.question}</h3>
            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="text-center bg-gradient-to-br from-[#f6f9fc] to-white rounded-3xl p-16 border border-gray-200">
        <h2 className="text-3xl font-bold mb-6 text-[#0a2540]">Still need help?</h2>
        <p className="text-gray-600 text-lg mb-10">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <a
          href="mailto:support@keelfinance.com"
          className="inline-block px-10 py-5 bg-[#635bff] text-white rounded-full text-lg font-medium hover:bg-[#5851ea] transition-all shadow-lg"
        >
          Contact Support
        </a>
      </div>
    </PageLayout>
  )
}

export default HelpCenterPage

