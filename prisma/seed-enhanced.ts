import { PrismaClient } from '@prisma/client'
import { addDays } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with enhanced data...')

  // Clear existing data (in correct order due to foreign keys)
  console.log('🧹 Clearing existing data...')
  await prisma.channelMetrics.deleteMany()
  await prisma.contentPerformance.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.approval.deleteMany()
  await prisma.publishingSlot.deleteMany()
  await prisma.contentItem.deleteMany()
  await prisma.contentSeries.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.channel.deleteMany()
  await prisma.user.deleteMany()
  await prisma.team.deleteMany()
  await prisma.optimizationConfig.deleteMany()

  // ============================================================================
  // CREATE TEAMS
  // ============================================================================

  const techStartupTeam = await prisma.team.create({
    data: {
      name: 'TechVenture Inc',
      slug: 'techventure',
      description: 'Innovative SaaS startup focused on developer tools',
      settings: {
        timezone: 'America/New_York',
        defaultLanguage: 'en',
      },
    },
  })

  console.log('✅ Created 1 team')

  // ============================================================================
  // CREATE USERS
  // ============================================================================

  const alice = await prisma.user.create({
    data: {
      email: 'alice@techventure.com',
      name: 'Alice Chen',
      role: 'MANAGER',
      teamId: techStartupTeam.id,
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
      preferences: {
        emailNotifications: true,
        theme: 'dark',
      },
      isActive: true,
      lastActiveAt: new Date(),
    },
  })

  const bob = await prisma.user.create({
    data: {
      email: 'bob@techventure.com',
      name: 'Bob Martinez',
      role: 'EDITOR',
      teamId: techStartupTeam.id,
      avatarUrl: 'https://i.pravatar.cc/150?img=12',
      preferences: {
        emailNotifications: true,
      },
      isActive: true,
      lastActiveAt: addDays(new Date(), -1),
    },
  })

  const carol = await prisma.user.create({
    data: {
      email: 'carol@techventure.com',
      name: 'Carol Davis',
      role: 'CONTRIBUTOR',
      teamId: techStartupTeam.id,
      avatarUrl: 'https://i.pravatar.cc/150?img=5',
      isActive: true,
    },
  })

  console.log('✅ Created 3 users')

  // ============================================================================
  // CREATE CHANNELS
  // ============================================================================

  const twitter = await prisma.channel.create({
    data: {
      name: 'X (Twitter)',
      type: 'SNS',
      teamId: techStartupTeam.id,
      isActive: true,
      metaJson: {
        handle: '@techventure',
        maxChars: 280,
        apiConnected: true,
      },
      configuration: {
        maxPostsPerDay: 5,
        preferredTimes: [9, 14, 18],
      },
    },
  })

  const instagram = await prisma.channel.create({
    data: {
      name: 'Instagram',
      type: 'SNS',
      teamId: techStartupTeam.id,
      isActive: true,
      metaJson: {
        handle: '@techventure',
        format: 'image+caption',
      },
      configuration: {
        maxPostsPerDay: 2,
        requiresImage: true,
      },
    },
  })

  const blog = await prisma.channel.create({
    data: {
      name: 'TechVenture Blog',
      type: 'BLOG',
      teamId: techStartupTeam.id,
      isActive: true,
      metaJson: {
        url: 'https://blog.techventure.com',
        cms: 'Ghost',
      },
      configuration: {
        maxPostsPerWeek: 3,
      },
    },
  })

  const newsletter = await prisma.channel.create({
    data: {
      name: 'Developer Insights Newsletter',
      type: 'EMAIL',
      teamId: techStartupTeam.id,
      isActive: true,
      metaJson: {
        subscribers: 12500,
        provider: 'SendGrid',
        frequency: 'weekly',
      },
    },
  })

  const youtube = await prisma.channel.create({
    data: {
      name: 'TechVenture YouTube',
      type: 'VIDEO',
      teamId: techStartupTeam.id,
      isActive: true,
      metaJson: {
        channelId: 'UCxxxxxxxx',
        subscribers: 8500,
      },
    },
  })

  console.log('✅ Created 5 channels')

  // ============================================================================
  // CREATE CAMPAIGNS
  // ============================================================================

  const productLaunchCampaign = await prisma.campaign.create({
    data: {
      name: 'Q2 Product Launch',
      description: 'Coordinated launch campaign for our new AI-powered code review tool',
      teamId: techStartupTeam.id,
      creatorId: alice.id,
      startDate: addDays(new Date(), 7),
      endDate: addDays(new Date(), 37),
      status: 'PLANNING',
      goals: {
        reach: 50000,
        signups: 1000,
        conversions: 100,
      },
    },
  })

  const thoughtLeadershipCampaign = await prisma.campaign.create({
    data: {
      name: 'Thought Leadership Series',
      description: 'Establish brand as thought leader in developer tools space',
      teamId: techStartupTeam.id,
      creatorId: alice.id,
      startDate: new Date(),
      endDate: addDays(new Date(), 90),
      status: 'ACTIVE',
      goals: {
        blogPosts: 12,
        socialEngagement: 10000,
      },
    },
  })

  console.log('✅ Created 2 campaigns')

  // ============================================================================
  // CREATE CONTENT SERIES
  // ============================================================================

  const aiBasicsSeries = await prisma.contentSeries.create({
    data: {
      name: 'AI for Developers: 101',
      description: '10-part series introducing AI concepts to developers',
      totalParts: 10,
      publishingPace: {
        interval: 'weekly',
        dayOfWeek: 2, // Tuesday
      },
      metadata: {
        difficulty: 'beginner',
        estimatedReadTime: 5,
      },
    },
  })

  console.log('✅ Created 1 content series')

  // ============================================================================
  // CREATE CONTENT ITEMS
  // ============================================================================

  const contentItems = [
    // Product Launch Campaign Content
    {
      title: 'Introducing CodeGuardian: AI-Powered Code Review',
      bodyDraft:
        'We\'re excited to announce CodeGuardian, our revolutionary AI-powered code review tool that catches bugs before they reach production. Built with cutting-edge machine learning...',
      targetChannelId: blog.id,
      creatorId: alice.id,
      campaignId: productLaunchCampaign.id,
      tagsJson: ['product-launch', 'AI', 'code-review'],
      status: 'READY',
      priority: 10,
      mediaUrls: ['https://cdn.example.com/codeguardian-hero.jpg'],
    },
    {
      title: '🚀 Big announcement coming next week! Our team has been working on something special for developers everywhere. Stay tuned! #devtools #AI',
      bodyDraft: 'Teaser for CodeGuardian launch',
      targetChannelId: twitter.id,
      creatorId: bob.id,
      campaignId: productLaunchCampaign.id,
      tagsJson: ['product-launch', 'teaser'],
      status: 'READY',
      priority: 9,
    },
    {
      title: 'Behind the scenes: Building CodeGuardian',
      bodyDraft: 'A visual tour of our development process',
      targetChannelId: instagram.id,
      creatorId: carol.id,
      campaignId: productLaunchCampaign.id,
      tagsJson: ['product-launch', 'BTS'],
      status: 'DRAFT',
      priority: 8,
      mediaUrls: ['https://cdn.example.com/bts-1.jpg', 'https://cdn.example.com/bts-2.jpg'],
    },

    // Thought Leadership Campaign Content
    {
      title: 'The State of Code Review in 2024',
      bodyDraft:
        'Code review has evolved significantly over the past decade. In this deep dive, we explore current trends, best practices, and what the future holds...',
      targetChannelId: blog.id,
      creatorId: alice.id,
      campaignId: thoughtLeadershipCampaign.id,
      tagsJson: ['code-review', 'trends', 'best-practices'],
      status: 'READY',
      priority: 7,
    },
    {
      title: 'How AI is Transforming Software Development',
      bodyDraft:
        'Artificial Intelligence is no longer just a buzzword. It\'s fundamentally changing how we write, test, and deploy code...',
      targetChannelId: blog.id,
      creatorId: bob.id,
      campaignId: thoughtLeadershipCampaign.id,
      seriesId: aiBasicsSeries.id,
      tagsJson: ['AI', 'software-development', 'trends'],
      status: 'READY',
      priority: 6,
    },

    // AI Series Content
    {
      title: 'AI for Developers Part 1: Understanding Machine Learning Basics',
      bodyDraft:
        'Welcome to our 10-part series on AI for developers! In this first installment, we\'ll cover the fundamentals of machine learning...',
      targetChannelId: blog.id,
      creatorId: alice.id,
      seriesId: aiBasicsSeries.id,
      tagsJson: ['AI', 'tutorial', 'machine-learning'],
      status: 'READY',
      priority: 5,
    },
    {
      title: 'AI for Developers Part 2: Neural Networks Demystified',
      bodyDraft:
        'Building on our previous post, let\'s dive into neural networks - the backbone of modern AI systems...',
      targetChannelId: blog.id,
      creatorId: alice.id,
      seriesId: aiBasicsSeries.id,
      tagsJson: ['AI', 'tutorial', 'neural-networks'],
      status: 'READY',
      priority: 5,
    },

    // Regular Social Content
    {
      title: '💡 Pro tip: Use TypeScript\'s `satisfies` operator for better type inference while maintaining type safety',
      bodyDraft: 'TypeScript tip of the day',
      targetChannelId: twitter.id,
      creatorId: bob.id,
      tagsJson: ['TypeScript', 'tips', 'programming'],
      status: 'READY',
      priority: 3,
    },
    {
      title: 'The Evolution of JavaScript: From ES6 to ES2024',
      bodyDraft:
        'JavaScript has come a long way. Let\'s explore the most impactful features added to the language over the years...',
      targetChannelId: blog.id,
      creatorId: bob.id,
      tagsJson: ['JavaScript', 'web-development'],
      status: 'READY',
      priority: 4,
    },
    {
      title: 'Weekly Developer Roundup: Top 5 Tools We\'re Loving',
      bodyDraft: 'Our team shares their favorite development tools and productivity hacks from this week...',
      targetChannelId: newsletter.id,
      creatorId: alice.id,
      tagsJson: ['newsletter', 'tools', 'productivity'],
      status: 'READY',
      priority: 6,
    },

    // Draft and Idea Content
    {
      title: 'Database Optimization Strategies for Scale',
      bodyDraft: 'When your app grows, database performance becomes critical. Here are proven strategies...',
      targetChannelId: blog.id,
      creatorId: carol.id,
      tagsJson: ['database', 'performance', 'scaling'],
      status: 'DRAFT',
      priority: 2,
    },
    {
      title: 'Microservices vs Monolith: Making the Right Choice',
      bodyDraft: 'The debate continues...',
      targetChannelId: blog.id,
      creatorId: alice.id,
      tagsJson: ['architecture', 'microservices'],
      status: 'IDEA',
      priority: 1,
    },
    {
      title: 'Team spotlight: Meet our lead engineer Sarah',
      bodyDraft: 'Interview with Sarah about her journey in tech',
      targetChannelId: instagram.id,
      creatorId: carol.id,
      tagsJson: ['team', 'culture', 'spotlight'],
      status: 'DRAFT',
      priority: 3,
    },
  ]

  for (const item of contentItems) {
    await prisma.contentItem.create({
      data: item,
    })
  }

  console.log(`✅ Created ${contentItems.length} content items`)

  // ============================================================================
  // CREATE OPTIMIZATION CONFIGS
  // ============================================================================

  await prisma.optimizationConfig.create({
    data: {
      name: 'Conservative Schedule',
      version: 1,
      isActive: true,
      rulesJson: {
        maxPostsPerDayPerChannel: 2,
        avoidConsecutiveSameTag: true,
        preferredTimes: [
          { hour: 9, minute: 0 },
          { hour: 14, minute: 0 },
          { hour: 18, minute: 0 },
        ],
        minimumHoursBetweenPosts: 4,
      },
    },
  })

  await prisma.optimizationConfig.create({
    data: {
      name: 'Aggressive Schedule',
      version: 1,
      isActive: false,
      rulesJson: {
        maxPostsPerDayPerChannel: 5,
        avoidConsecutiveSameTag: false,
        preferredTimes: [
          { hour: 8, minute: 0 },
          { hour: 11, minute: 0 },
          { hour: 14, minute: 0 },
          { hour: 17, minute: 0 },
          { hour: 20, minute: 0 },
        ],
      },
    },
  })

  console.log('✅ Created 2 optimization configs')

  // ============================================================================
  // CREATE SAMPLE PERFORMANCE DATA
  // ============================================================================

  // Get a few published content items (we'll pretend some are published)
  const publishedItems = await prisma.contentItem.findMany({
    take: 3,
    where: {
      status: 'READY',
    },
  })

  // Update them to published and add performance data
  for (const item of publishedItems) {
    await prisma.contentItem.update({
      where: { id: item.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: addDays(new Date(), -Math.floor(Math.random() * 30)),
      },
    })

    await prisma.contentPerformance.create({
      data: {
        contentItemId: item.id,
        views: Math.floor(Math.random() * 10000) + 1000,
        clicks: Math.floor(Math.random() * 500) + 50,
        shares: Math.floor(Math.random() * 100) + 10,
        likes: Math.floor(Math.random() * 500) + 50,
        comments: Math.floor(Math.random() * 50) + 5,
        engagement: Math.random() * 10 + 2,
        recordedAt: addDays(new Date(), -Math.floor(Math.random() * 7)),
      },
    })
  }

  console.log('✅ Created performance data for published content')

  // ============================================================================
  // CREATE SAMPLE ACTIVITIES
  // ============================================================================

  await prisma.activity.create({
    data: {
      userId: alice.id,
      action: 'CREATE',
      entityType: 'Campaign',
      entityId: productLaunchCampaign.id,
      metadata: {
        campaignName: productLaunchCampaign.name,
      },
    },
  })

  await prisma.activity.create({
    data: {
      userId: bob.id,
      action: 'CREATE',
      entityType: 'ContentItem',
      entityId: publishedItems[0]?.id || 'unknown',
      metadata: {
        title: 'Sample content',
      },
    },
  })

  console.log('✅ Created sample activity logs')

  console.log('\n🎉 Enhanced seeding completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`   - 1 team`)
  console.log(`   - 3 users (alice@techventure.com, bob@techventure.com, carol@techventure.com)`)
  console.log(`   - 5 channels (Twitter, Instagram, Blog, Newsletter, YouTube)`)
  console.log(`   - 2 campaigns (Product Launch, Thought Leadership)`)
  console.log(`   - 1 content series (AI 101)`)
  console.log(`   - ${contentItems.length} content items`)
  console.log(`   - 2 optimization configs`)
  console.log(`   - Performance metrics for published content`)
  console.log(`\n💡 Next steps:`)
  console.log(`   1. Run: npm run dev`)
  console.log(`   2. Visit: http://localhost:3000`)
  console.log(`   3. Try the "Auto-Schedule" button to see the scheduling algorithm in action!`)
}

main()
  .catch(e => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
