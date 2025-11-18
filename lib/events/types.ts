/**
 * Domain Event Types
 * Events that can be emitted throughout the system
 */

export interface DomainEvent<T = unknown> {
  type: string
  timestamp: Date
  payload: T
  metadata?: Record<string, unknown>
}

// ============================================================================
// CONTENT EVENTS
// ============================================================================

export interface ContentCreatedPayload {
  contentId: string
  title: string
  channelId: string
  creatorId?: string
  status: string
}

export interface ContentUpdatedPayload {
  contentId: string
  changes: Record<string, unknown>
  previousStatus?: string
  newStatus?: string
}

export interface ContentScheduledPayload {
  contentId: string
  slotId: string
  scheduledAt: Date
  channelId: string
}

export interface ContentPublishedPayload {
  contentId: string
  slotId: string
  channelId: string
  publishedAt: Date
  publishedUrl?: string
}

export interface ContentArchivedPayload {
  contentId: string
  reason?: string
}

// ============================================================================
// SCHEDULE EVENTS
// ============================================================================

export interface ScheduleOptimizedPayload {
  slotsCreated: number
  itemsScheduled: number
  score: number
  dateRange: {
    start: Date
    end: Date
  }
  configUsed?: string
}

export interface SlotStatusChangedPayload {
  slotId: string
  previousStatus: string
  newStatus: string
  error?: string
}

// ============================================================================
// COLLABORATION EVENTS
// ============================================================================

export interface ApprovalRequestedPayload {
  contentId: string
  approverId: string
  requestedBy: string
}

export interface ApprovalDecidedPayload {
  contentId: string
  approverId: string
  decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'
  comments?: string
}

export interface CommentAddedPayload {
  contentId: string
  commentId: string
  authorId: string
  content: string
}

// ============================================================================
// CAMPAIGN EVENTS
// ============================================================================

export interface CampaignCreatedPayload {
  campaignId: string
  name: string
  creatorId?: string
  teamId?: string
}

export interface CampaignStatusChangedPayload {
  campaignId: string
  previousStatus: string
  newStatus: string
}

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

export interface MetricsRecordedPayload {
  contentId: string
  channelId: string
  metrics: {
    views: number
    clicks: number
    shares: number
    likes: number
    comments: number
    engagement: number
  }
  recordedAt: Date
}

// ============================================================================
// EVENT TYPE CONSTANTS
// ============================================================================

export const EventTypes = {
  // Content
  CONTENT_CREATED: 'content.created',
  CONTENT_UPDATED: 'content.updated',
  CONTENT_SCHEDULED: 'content.scheduled',
  CONTENT_PUBLISHED: 'content.published',
  CONTENT_ARCHIVED: 'content.archived',

  // Schedule
  SCHEDULE_OPTIMIZED: 'schedule.optimized',
  SLOT_STATUS_CHANGED: 'slot.status_changed',

  // Collaboration
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_DECIDED: 'approval.decided',
  COMMENT_ADDED: 'comment.added',

  // Campaign
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_STATUS_CHANGED: 'campaign.status_changed',

  // Analytics
  METRICS_RECORDED: 'metrics.recorded',
} as const

export type EventType = (typeof EventTypes)[keyof typeof EventTypes]
