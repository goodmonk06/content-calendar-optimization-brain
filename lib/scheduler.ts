import { ContentItem, Channel } from '@prisma/client'
import { addDays, startOfDay, setHours, setMinutes } from 'date-fns'

export interface SchedulingRules {
  maxPostsPerDayPerChannel: number
  avoidConsecutiveSameTag: boolean
  preferredTimeSlots?: { hour: number; minute: number }[]
  daysToSchedule: number
}

export interface ScheduledSlot {
  channelId: string
  scheduledAt: Date
  contentItemId: string
}

type ContentItemWithChannel = ContentItem & { targetChannel: Channel }

export class ContentScheduler {
  private rules: SchedulingRules

  constructor(rules?: Partial<SchedulingRules>) {
    this.rules = {
      maxPostsPerDayPerChannel: rules?.maxPostsPerDayPerChannel ?? 2,
      avoidConsecutiveSameTag: rules?.avoidConsecutiveSameTag ?? true,
      preferredTimeSlots: rules?.preferredTimeSlots ?? [
        { hour: 9, minute: 0 },   // 9 AM
        { hour: 14, minute: 0 },  // 2 PM
        { hour: 18, minute: 0 },  // 6 PM
      ],
      daysToSchedule: rules?.daysToSchedule ?? 30,
    }
  }

  /**
   * Generate optimized publishing schedule for ready content items
   */
  public generateSchedule(contentItems: ContentItemWithChannel[]): ScheduledSlot[] {
    const slots: ScheduledSlot[] = []
    const startDate = startOfDay(addDays(new Date(), 1)) // Start tomorrow

    // Group items by channel
    const itemsByChannel = this.groupByChannel(contentItems)

    // Track what was scheduled on each day per channel for conflict detection
    const scheduleMap = new Map<string, Map<string, ScheduledSlot[]>>()

    for (const [channelId, items] of Object.entries(itemsByChannel)) {
      let currentDay = 0
      let itemIndex = 0

      while (itemIndex < items.length && currentDay < this.rules.daysToSchedule) {
        const currentDate = addDays(startDate, currentDay)
        const dayKey = currentDate.toISOString().split('T')[0]

        // Initialize schedule tracking for this channel/day
        if (!scheduleMap.has(channelId)) {
          scheduleMap.set(channelId, new Map())
        }
        const channelSchedule = scheduleMap.get(channelId)!
        if (!channelSchedule.has(dayKey)) {
          channelSchedule.set(dayKey, [])
        }

        const slotsForDay = channelSchedule.get(dayKey)!

        // Check if we can schedule more items today
        if (slotsForDay.length >= this.rules.maxPostsPerDayPerChannel) {
          currentDay++
          continue
        }

        const item = items[itemIndex]

        // Check for tag conflicts if rule is enabled
        if (this.rules.avoidConsecutiveSameTag && slotsForDay.length > 0) {
          const hasConflict = this.hasTagConflict(item, slotsForDay, items)
          if (hasConflict) {
            // Try next item instead
            itemIndex++
            continue
          }
        }

        // Assign time slot
        const timeSlotIndex = slotsForDay.length % this.rules.preferredTimeSlots!.length
        const timeSlot = this.rules.preferredTimeSlots![timeSlotIndex]

        const scheduledAt = setMinutes(
          setHours(currentDate, timeSlot.hour),
          timeSlot.minute
        )

        const slot: ScheduledSlot = {
          channelId,
          scheduledAt,
          contentItemId: item.id,
        }

        slots.push(slot)
        slotsForDay.push(slot)

        itemIndex++
      }
    }

    return slots
  }

  /**
   * Group content items by channel
   */
  private groupByChannel(items: ContentItemWithChannel[]): Record<string, ContentItemWithChannel[]> {
    return items.reduce((acc, item) => {
      const channelId = item.targetChannelId
      if (!acc[channelId]) {
        acc[channelId] = []
      }
      acc[channelId].push(item)
      return acc
    }, {} as Record<string, ContentItemWithChannel[]>)
  }

  /**
   * Check if an item has tag conflicts with already scheduled items
   */
  private hasTagConflict(
    item: ContentItem,
    slotsForDay: ScheduledSlot[],
    allItems: ContentItemWithChannel[]
  ): boolean {
    if (!item.tagsJson || !Array.isArray(item.tagsJson) || item.tagsJson.length === 0) {
      return false
    }

    const itemTags = new Set(item.tagsJson as string[])

    for (const slot of slotsForDay) {
      const scheduledItem = allItems.find(i => i.id === slot.contentItemId)
      if (!scheduledItem?.tagsJson || !Array.isArray(scheduledItem.tagsJson)) {
        continue
      }

      const scheduledTags = scheduledItem.tagsJson as string[]
      const hasOverlap = scheduledTags.some(tag => itemTags.has(tag))
      if (hasOverlap) {
        return true
      }
    }

    return false
  }

  /**
   * Validate and score a proposed schedule
   */
  public scoreSchedule(slots: ScheduledSlot[]): number {
    let score = 100

    // Check distribution - penalize clustering
    const slotsByDay = new Map<string, number>()
    for (const slot of slots) {
      const dayKey = slot.scheduledAt.toISOString().split('T')[0]
      slotsByDay.set(dayKey, (slotsByDay.get(dayKey) || 0) + 1)
    }

    const counts = Array.from(slotsByDay.values())
    const variance = this.calculateVariance(counts)
    score -= variance * 5 // Penalize high variance in daily distribution

    return Math.max(0, score)
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2))
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length
  }
}
