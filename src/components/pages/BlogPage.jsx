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
      <div className="text-center mb-16">
        <div className="inline-block bg-purple-500/20 text-purple-400 text-sm font-semibold px-4 py-2 rounded-full mb-4">
          BLOG
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          The Keel Blog
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Tips, insights, and strategies to help you master your money.
        </p>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 mb-12 text-center">
        <span className="text-2xl mb-2 block">✨</span>
        <h3 className="font-semibold text-purple-400 mb-2">Blog Coming Soon!</h3>
        <p className="text-gray-400">
          We're working on helpful content to support your financial journey. Check back soon!
        </p>
      </div>

      {/* Preview Posts */}
      <div className="grid md:grid-cols-2 gap-6 mb-16">
        {posts.map((post, index) => (
          <div key={index} className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 opacity-75">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{post.category}</span>
              <span className="text-xs text-gray-500">{post.date}</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
            <p className="text-gray-400 text-sm">{post.excerpt}</p>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl p-12 border border-purple-500/30">
        <h2 className="text-3xl font-bold mb-4">Don't wait for the blog</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Start improving your finances today with Keel's intuitive tools.
        </p>
        <button
          onClick={onGetStarted}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all cursor-pointer"
        >
          Try Keel Free for 7 Days
        </button>
      </div>
    </PageLayout>
  )
}

export default BlogPage

