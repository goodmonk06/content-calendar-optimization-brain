#!/usr/bin/env node

/**
 * Content Calendar CLI Tool
 * Utility commands for managing the content calendar system
 */

import { PrismaClient } from '@prisma/client'
import { ContentScheduler } from '../lib/scheduler'
import { adapterRegistry } from '../lib/adapters/registry'
import { eventBus } from '../lib/events'
import { metrics } from '../lib/metrics'

const prisma = new PrismaClient()

const commands = {
  async stats() {
    console.log('📊 Content Calendar Statistics\n')

    const [
      channels,
      contentItems,
      campaigns,
      users,
      publishingSlots,
      teams,
    ] = await Promise.all([
      prisma.channel.count(),
      prisma.contentItem.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.campaign.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.user.count(),
      prisma.publishingSlot.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.team.count(),
    ])

    console.log(`Teams: ${teams}`)
    console.log(`Users: ${users}`)
    console.log(`Channels: ${channels}`)
    console.log(`\nContent Items:`)
    contentItems.forEach(group => {
      console.log(`  ${group.status}: ${group._count}`)
    })
    console.log(`\nCampaigns:`)
    campaigns.forEach(group => {
      console.log(`  ${group.status}: ${group._count}`)
    })
    console.log(`\nPublishing Slots:`)
    publishingSlots.forEach(group => {
      console.log(`  ${group.status}: ${group._count}`)
    })

    console.log(`\n📈 System Metrics:`)
    const metricsStats = metrics.getStats()
    console.log(`  Total Metrics: ${metricsStats.totalMetrics}`)
    console.log(`  Counters: ${metricsStats.counters}`)
    console.log(`  Gauges: ${metricsStats.gauges}`)

    console.log(`\n🔌 Adapter Registry:`)
    const adapterStats = adapterRegistry.getStats()
    console.log(`  Total Adapters: ${adapterStats.total}`)
    console.log(`  Publishing: ${adapterStats.publishing}`)
    console.log(`  Analytics: ${adapterStats.analytics}`)
    console.log(`  Notifications: ${adapterStats.notifications}`)
    console.log(`  Storage: ${adapterStats.storage}`)
    console.log(`  AI: ${adapterStats.ai}`)

    console.log(`\n📡 Event Bus:`)
    const eventStats = eventBus.getStats()
    console.log(`  Total Handlers: ${eventStats.totalHandlers}`)
    console.log(`  Event Types: ${eventStats.eventTypes}`)
    console.log(`  History Size: ${eventStats.historySize}`)
  },

  async schedule() {
    console.log('🗓️  Auto-scheduling ready content...\n')

    const readyItems = await prisma.contentItem.findMany({
      where: { status: 'READY' },
      include: {
        targetChannel: true,
      },
    })

    if (readyItems.length === 0) {
      console.log('ℹ️  No READY content items found to schedule')
      return
    }

    console.log(`Found ${readyItems.length} READY items`)

    const scheduler = new ContentScheduler({
      daysToSchedule: 30,
      maxPostsPerDayPerChannel: 2,
      avoidConsecutiveSameTag: true,
    })

    const schedule = scheduler.generateSchedule(readyItems)

    console.log(`\n✅ Generated schedule with ${schedule.length} slots`)

    // Create slots in database
    for (const slot of schedule) {
      await prisma.publishingSlot.create({
        data: {
          channelId: slot.channelId,
          scheduledAt: slot.scheduledAt,
          contentItemId: slot.contentItemId,
          status: 'PENDING',
          metaJson: { cliGenerated: true },
        },
      })
    }

    // Update content items to SCHEDULED
    await prisma.contentItem.updateMany({
      where: {
        id: {
          in: schedule.map(s => s.contentItemId),
        },
      },
      data: {
        status: 'SCHEDULED',
      },
    })

    const score = scheduler.scoreSchedule(schedule)
    console.log(`Schedule Score: ${score.toFixed(2)}/100`)
    console.log(`\n✨ Scheduling complete!`)
  },

  async channels() {
    console.log('📺 Channels\n')

    const channels = await prisma.channel.findMany({
      include: {
        _count: {
          select: {
            contentItems: true,
            publishingSlots: true,
          },
        },
      },
    })

    channels.forEach(channel => {
      console.log(`${channel.name} (${channel.type})`)
      console.log(`  ID: ${channel.id}`)
      console.log(`  Active: ${channel.isActive}`)
      console.log(`  Content Items: ${channel._count.contentItems}`)
      console.log(`  Publishing Slots: ${channel._count.publishingSlots}`)
      console.log()
    })
  },

  async campaigns() {
    console.log('🎯 Campaigns\n')

    const campaigns = await prisma.campaign.findMany({
      include: {
        _count: {
          select: {
            contentItems: true,
          },
        },
      },
    })

    campaigns.forEach(campaign => {
      console.log(`${campaign.name} (${campaign.status})`)
      console.log(`  ID: ${campaign.id}`)
      console.log(`  Description: ${campaign.description || 'N/A'}`)
      console.log(`  Content Items: ${campaign._count.contentItems}`)
      if (campaign.startDate) {
        console.log(`  Start: ${campaign.startDate.toLocaleDateString()}`)
      }
      if (campaign.endDate) {
        console.log(`  End: ${campaign.endDate.toLocaleDateString()}`)
      }
      console.log()
    })
  },

  async cleanup() {
    console.log('🧹 Cleaning up old data...\n')

    // Delete old publishing slots that have passed
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const result = await prisma.publishingSlot.deleteMany({
      where: {
        scheduledAt: {
          lt: yesterday,
        },
        status: {
          in: ['PUBLISHED', 'FAILED', 'CANCELLED'],
        },
      },
    })

    console.log(`✅ Deleted ${result.count} old publishing slots`)
  },

  async help() {
    console.log('Content Calendar CLI\n')
    console.log('Available commands:')
    console.log('  stats      - Show system statistics')
    console.log('  schedule   - Auto-schedule READY content items')
    console.log('  channels   - List all channels')
    console.log('  campaigns  - List all campaigns')
    console.log('  cleanup    - Clean up old data')
    console.log('  help       - Show this help message')
    console.log('\nUsage:')
    console.log('  npm run cli <command>')
    console.log('  or')
    console.log('  pnpm cli <command>')
  },
}

async function main() {
  const command = process.argv[2] || 'help'

  if (!(command in commands)) {
    console.error(`❌ Unknown command: ${command}`)
    console.log('Run "npm run cli help" for available commands')
    process.exit(1)
  }

  try {
    await commands[command as keyof typeof commands]()
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
  .catch(e => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
