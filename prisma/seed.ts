import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await prisma.publishingSlot.deleteMany()
  await prisma.contentItem.deleteMany()
  await prisma.channel.deleteMany()
  await prisma.optimizationConfig.deleteMany()

  // Create Channels
  const twitter = await prisma.channel.create({
    data: {
      name: 'X (Twitter)',
      type: 'SNS',
      metaJson: {
        handle: '@company',
        maxChars: 280,
      },
    },
  })

  const instagram = await prisma.channel.create({
    data: {
      name: 'Instagram',
      type: 'SNS',
      metaJson: {
        handle: '@company',
        format: 'image+caption',
      },
    },
  })

  const blog = await prisma.channel.create({
    data: {
      name: 'Company Blog',
      type: 'BLOG',
      metaJson: {
        url: 'https://blog.company.com',
      },
    },
  })

  const newsletter = await prisma.channel.create({
    data: {
      name: 'Weekly Newsletter',
      type: 'EMAIL',
      metaJson: {
        subscribers: 5000,
        frequency: 'weekly',
      },
    },
  })

  console.log('✅ Created 4 channels')

  // Create Content Items
  const contentIdeas = [
    {
      title: 'AI in Modern Software Development',
      bodyDraft: 'Exploring how AI is transforming the way we build software...',
      channel: blog,
      tags: ['AI', 'development', 'technology'],
      status: 'READY' as const,
    },
    {
      title: 'Quick tip: Keyboard shortcuts for developers',
      bodyDraft: 'Boost your productivity with these essential keyboard shortcuts...',
      channel: twitter,
      tags: ['productivity', 'tips'],
      status: 'READY' as const,
    },
    {
      title: 'Behind the scenes: Our development process',
      bodyDraft: 'A peek into how we ship features...',
      channel: instagram,
      tags: ['BTS', 'process'],
      status: 'READY' as const,
    },
    {
      title: 'Understanding TypeScript Generics',
      bodyDraft: 'Deep dive into TypeScript generics with practical examples...',
      channel: blog,
      tags: ['TypeScript', 'tutorial'],
      status: 'READY' as const,
    },
    {
      title: 'Monthly Tech Round-up: March 2024',
      bodyDraft: 'All the latest updates from our team this month...',
      channel: newsletter,
      tags: ['newsletter', 'updates'],
      status: 'READY' as const,
    },
    {
      title: 'The Future of Web Development',
      bodyDraft: 'What trends should developers watch in 2024?',
      channel: blog,
      tags: ['web', 'trends', 'future'],
      status: 'READY' as const,
    },
    {
      title: 'Code review best practices',
      bodyDraft: 'How to give and receive constructive code feedback...',
      channel: twitter,
      tags: ['code-review', 'best-practices'],
      status: 'READY' as const,
    },
    {
      title: 'Product launch announcement',
      bodyDraft: 'Exciting news! We are launching our new feature...',
      channel: instagram,
      tags: ['product', 'launch'],
      status: 'READY' as const,
    },
    {
      title: 'Database optimization strategies',
      bodyDraft: 'Learn how to optimize your database queries for better performance...',
      channel: blog,
      tags: ['database', 'performance'],
      status: 'READY' as const,
    },
    {
      title: 'Team spotlight: Meet our engineers',
      bodyDraft: 'Get to know the people building our products...',
      channel: instagram,
      tags: ['team', 'culture'],
      status: 'READY' as const,
    },
    {
      title: 'API design principles',
      bodyDraft: 'Designing APIs that developers love to use...',
      channel: blog,
      tags: ['API', 'design'],
      status: 'DRAFT' as const,
    },
    {
      title: 'Cloud migration tips',
      bodyDraft: 'Moving to the cloud? Here is what you need to know...',
      channel: twitter,
      tags: ['cloud', 'migration'],
      status: 'IDEA' as const,
    },
    {
      title: 'Security best practices for startups',
      bodyDraft: 'Essential security practices every startup should implement...',
      channel: blog,
      tags: ['security', 'startups'],
      status: 'IDEA' as const,
    },
    {
      title: 'Weekly feature showcase',
      bodyDraft: 'Check out what is new this week...',
      channel: instagram,
      tags: ['features', 'showcase'],
      status: 'DRAFT' as const,
    },
    {
      title: 'Developer happiness: Building a great engineering culture',
      bodyDraft: 'How we create an environment where engineers thrive...',
      channel: newsletter,
      tags: ['culture', 'engineering'],
      status: 'READY' as const,
    },
  ]

  for (const item of contentIdeas) {
    await prisma.contentItem.create({
      data: {
        title: item.title,
        bodyDraft: item.bodyDraft,
        targetChannelId: item.channel.id,
        tagsJson: item.tags,
        status: item.status,
      },
    })
  }

  console.log(`✅ Created ${contentIdeas.length} content items`)

  // Create default optimization config
  await prisma.optimizationConfig.create({
    data: {
      name: 'Default Rules',
      isActive: true,
      rulesJson: {
        maxPostsPerDayPerChannel: 2,
        avoidConsecutiveSameTag: true,
        preferredTimes: [
          { hour: 9, minute: 0 },
          { hour: 14, minute: 0 },
          { hour: 18, minute: 0 },
        ],
      },
    },
  })

  console.log('✅ Created optimization config')
  console.log('🎉 Seeding completed successfully!')
}

main()
  .catch(e => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
