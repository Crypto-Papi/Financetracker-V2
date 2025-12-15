import { PageLayout } from './PageLayout'

/**
 * Blog page - placeholder with coming soon message
 */
export function BlogPage({ onBack, onNavigate, onGetStarted }) {
  const posts = [
    {
      title: '5 Simple Steps to Start Budgeting Today',
      excerpt: 'Budgeting doesn\'t have to be complicated. Here\'s how to get started in just 5 minutes.',
      date: 'Coming Soon',
      category: 'Budgeting'
    },
    {
      title: 'Debt Snowball vs Avalanche: Which is Right for You?',
      excerpt: 'Two popular strategies for paying off debt. We break down the pros and cons of each.',
      date: 'Coming Soon',
      category: 'Debt'
    },
    {
      title: 'How to Build an Emergency Fund from Scratch',
      excerpt: 'An emergency fund is your financial safety net. Here\'s how to build one, even on a tight budget.',
      date: 'Coming Soon',
      category: 'Savings'
    },
    {
      title: 'The Psychology of Spending: Why We Buy What We Buy',
      excerpt: 'Understanding your spending triggers is the first step to changing your habits.',
      date: 'Coming Soon',
      category: 'Mindset'
    },
  ]

  return (
    <PageLayout onBack={onBack} onNavigate={onNavigate}>
      {/* Hero Section */}
      <div className="text-center mb-20">
        <div className="inline-block bg-[#635bff]/10 text-[#635bff] text-sm font-semibold px-4 py-2 rounded-full mb-6">
          BLOG
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#0a2540]">
          The Keel Blog
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Tips, insights, and strategies to help you master your money.
        </p>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-gradient-to-br from-[#635bff]/5 to-[#00d4ff]/5 border-2 border-[#635bff]/20 rounded-3xl p-10 mb-16 text-center">
        <span className="text-4xl mb-4 block">✨</span>
        <h3 className="font-bold text-2xl text-[#635bff] mb-3">Blog Coming Soon!</h3>
        <p className="text-gray-600 text-lg">
          We're working on helpful content to support your financial journey. Check back soon!
        </p>
      </div>

      {/* Preview Posts */}
      <div className="grid md:grid-cols-2 gap-6 mb-20">
        {posts.map((post, index) => (
          <div key={index} className="bg-white rounded-2xl p-8 border border-gray-200 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs bg-[#f6f9fc] text-[#635bff] font-medium px-3 py-1 rounded-full">{post.category}</span>
              <span className="text-xs text-gray-500">{post.date}</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-[#0a2540]">{post.title}</h3>
            <p className="text-gray-600">{post.excerpt}</p>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-br from-[#635bff] to-[#00d4ff] rounded-3xl p-16 shadow-2xl">
        <h2 className="text-4xl font-bold mb-6 text-white">Don't wait for the blog</h2>
        <p className="text-white/90 text-lg mb-10 max-w-xl mx-auto">
          Start improving your finances today with Keel's intuitive tools.
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

export default BlogPage

