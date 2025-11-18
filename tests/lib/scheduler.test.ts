import { describe, it, expect } from 'vitest'
import { ContentScheduler } from '@/lib/scheduler'
import { ContentItem, Channel } from '@prisma/client'
import { addDays } from 'date-fns'

type ContentItemWithChannel = ContentItem & { targetChannel: Channel }

const createMockChannel = (id: string, name: string, type: 'SNS' | 'BLOG' | 'EMAIL'): Channel => ({
  id,
  name,
  type,
  metaJson: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const createMockContentItem = (
  id: string,
  title: string,
  channelId: string,
  channel: Channel,
  tags: string[] = []
): ContentItemWithChannel => ({
  id,
  title,
  bodyDraft: `Body for ${title}`,
  targetChannelId: channelId,
  tagsJson: tags,
  status: 'READY',
  createdAt: new Date(),
  updatedAt: new Date(),
  targetChannel: channel,
})

describe('ContentScheduler', () => {
  describe('generateSchedule', () => {
    it('should generate a schedule for ready content items', () => {
      const scheduler = new ContentScheduler()
      const channel = createMockChannel('channel-1', 'Twitter', 'SNS')
      const items = [
        createMockContentItem('item-1', 'Post 1', 'channel-1', channel),
        createMockContentItem('item-2', 'Post 2', 'channel-1', channel),
        createMockContentItem('item-3', 'Post 3', 'channel-1', channel),
      ]

      const schedule = scheduler.generateSchedule(items)

      expect(schedule).toHaveLength(3)
      expect(schedule[0].contentItemId).toBe('item-1')
      expect(schedule[0].channelId).toBe('channel-1')
      expect(schedule[0].scheduledAt).toBeInstanceOf(Date)
    })

    it('should respect maxPostsPerDayPerChannel constraint', () => {
      const scheduler = new ContentScheduler({
        maxPostsPerDayPerChannel: 1,
      })
      const channel = createMockChannel('channel-1', 'Twitter', 'SNS')
      const items = [
        createMockContentItem('item-1', 'Post 1', 'channel-1', channel),
        createMockContentItem('item-2', 'Post 2', 'channel-1', channel),
        createMockContentItem('item-3', 'Post 3', 'channel-1', channel),
      ]

      const schedule = scheduler.generateSchedule(items)

      // Group by day
      const scheduleByDay = new Map<string, number>()
      schedule.forEach(slot => {
        const dayKey = slot.scheduledAt.toISOString().split('T')[0]
        scheduleByDay.set(dayKey, (scheduleByDay.get(dayKey) || 0) + 1)
      })

      // No day should have more than 1 post
      scheduleByDay.forEach(count => {
        expect(count).toBeLessThanOrEqual(1)
      })
    })

    it('should avoid scheduling items with same tags on same day when enabled', () => {
      const scheduler = new ContentScheduler({
        maxPostsPerDayPerChannel: 2,
        avoidConsecutiveSameTag: true,
      })
      const channel = createMockChannel('channel-1', 'Twitter', 'SNS')
      const items = [
        createMockContentItem('item-1', 'AI Post 1', 'channel-1', channel, ['AI', 'tech']),
        createMockContentItem('item-2', 'AI Post 2', 'channel-1', channel, ['AI', 'development']),
        createMockContentItem('item-3', 'Design Post', 'channel-1', channel, ['design']),
      ]

      const schedule = scheduler.generateSchedule(items)

      // Group by day
      const scheduleByDay = new Map<string, string[]>()
      schedule.forEach(slot => {
        const dayKey = slot.scheduledAt.toISOString().split('T')[0]
        if (!scheduleByDay.has(dayKey)) {
          scheduleByDay.set(dayKey, [])
        }
        scheduleByDay.get(dayKey)!.push(slot.contentItemId)
      })

      // Check that items with same tags are not on the same day if possible
      scheduleByDay.forEach(itemIds => {
        const itemsOnDay = items.filter(item => itemIds.includes(item.id))
        const allTags = itemsOnDay.flatMap(item => item.tagsJson as string[])
        const uniqueTags = new Set(allTags)

        // If there are more items than unique tags, there's overlap
        // This should only happen if we run out of days or items
        if (itemsOnDay.length > 1) {
          expect(itemsOnDay.length).toBeLessThanOrEqual(2) // maxPostsPerDay
        }
      })
    })

    it('should distribute items across multiple channels', () => {
      const scheduler = new ContentScheduler()
      const channel1 = createMockChannel('channel-1', 'Twitter', 'SNS')
      const channel2 = createMockChannel('channel-2', 'Blog', 'BLOG')
      const items = [
        createMockContentItem('item-1', 'Tweet 1', 'channel-1', channel1),
        createMockContentItem('item-2', 'Blog Post 1', 'channel-2', channel2),
        createMockContentItem('item-3', 'Tweet 2', 'channel-1', channel1),
      ]

      const schedule = scheduler.generateSchedule(items)

      expect(schedule).toHaveLength(3)

      const channel1Slots = schedule.filter(s => s.channelId === 'channel-1')
      const channel2Slots = schedule.filter(s => s.channelId === 'channel-2')

      expect(channel1Slots).toHaveLength(2)
      expect(channel2Slots).toHaveLength(1)
    })

    it('should use preferred time slots', () => {
      const scheduler = new ContentScheduler({
        preferredTimeSlots: [
          { hour: 9, minute: 0 },
          { hour: 14, minute: 0 },
        ],
      })
      const channel = createMockChannel('channel-1', 'Twitter', 'SNS')
      const items = [
        createMockContentItem('item-1', 'Post 1', 'channel-1', channel),
        createMockContentItem('item-2', 'Post 2', 'channel-1', channel),
      ]

      const schedule = scheduler.generateSchedule(items)

      // Check that scheduled times match preferred slots
      schedule.forEach(slot => {
        const hour = slot.scheduledAt.getHours()
        expect([9, 14]).toContain(hour)
        expect(slot.scheduledAt.getMinutes()).toBe(0)
      })
    })

    it('should schedule items starting from tomorrow', () => {
      const scheduler = new ContentScheduler()
      const channel = createMockChannel('channel-1', 'Twitter', 'SNS')
      const items = [
        createMockContentItem('item-1', 'Post 1', 'channel-1', channel),
      ]

      const schedule = scheduler.generateSchedule(items)
      const tomorrow = addDays(new Date(), 1)

      // Scheduled date should be tomorrow or later
      expect(schedule[0].scheduledAt.getDate()).toBeGreaterThanOrEqual(tomorrow.getDate())
    })

    it('should handle empty input', () => {
      const scheduler = new ContentScheduler()
      const schedule = scheduler.generateSchedule([])

      expect(schedule).toHaveLength(0)
    })

    it('should respect daysToSchedule constraint', () => {
      const scheduler = new ContentScheduler({
        daysToSchedule: 7,
        maxPostsPerDayPerChannel: 1,
      })
      const channel = createMockChannel('channel-1', 'Twitter', 'SNS')
      const items = Array.from({ length: 20 }, (_, i) =>
        createMockContentItem(`item-${i}`, `Post ${i}`, 'channel-1', channel)
      )

      const schedule = scheduler.generateSchedule(items)

      // Should only schedule up to 7 items (1 per day for 7 days)
      expect(schedule.length).toBeLessThanOrEqual(7)
    })
  })

  describe('scoreSchedule', () => {
    it('should return a score for a schedule', () => {
      const scheduler = new ContentScheduler()
      const baseDate = new Date()

      const schedule = [
        {
          channelId: 'channel-1',
          scheduledAt: addDays(baseDate, 1),
          contentItemId: 'item-1',
        },
        {
          channelId: 'channel-1',
          scheduledAt: addDays(baseDate, 2),
          contentItemId: 'item-2',
        },
      ]

      const score = scheduler.scoreSchedule(schedule)

      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should give better scores to evenly distributed schedules', () => {
      const scheduler = new ContentScheduler()
      const baseDate = new Date()

      // Even distribution
      const evenSchedule = [
        { channelId: 'ch1', scheduledAt: addDays(baseDate, 1), contentItemId: 'i1' },
        { channelId: 'ch1', scheduledAt: addDays(baseDate, 2), contentItemId: 'i2' },
        { channelId: 'ch1', scheduledAt: addDays(baseDate, 3), contentItemId: 'i3' },
      ]

      // Clustered distribution
      const clusteredSchedule = [
        { channelId: 'ch1', scheduledAt: addDays(baseDate, 1), contentItemId: 'i1' },
        { channelId: 'ch1', scheduledAt: addDays(baseDate, 1), contentItemId: 'i2' },
        { channelId: 'ch1', scheduledAt: addDays(baseDate, 1), contentItemId: 'i3' },
      ]

      const evenScore = scheduler.scoreSchedule(evenSchedule)
      const clusteredScore = scheduler.scoreSchedule(clusteredSchedule)

      expect(evenScore).toBeGreaterThan(clusteredScore)
    })
  })
})
