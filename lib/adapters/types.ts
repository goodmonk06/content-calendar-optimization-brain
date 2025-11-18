/**
 * Adapter interfaces for extending the content calendar system
 * These interfaces allow plugging in different implementations for various services
 */

// ============================================================================
// PUBLISHING ADAPTERS
// ============================================================================

export interface PublishResult {
  success: boolean
  publishedId?: string
  url?: string
  error?: string
  metadata?: Record<string, unknown>
}

export interface IPublishingAdapter {
  /**
   * Unique identifier for the adapter (e.g., 'twitter', 'instagram')
   */
  readonly name: string

  /**
   * Publish content to the platform
   */
  publish(content: PublishContent): Promise<PublishResult>

  /**
   * Delete/unpublish content from the platform
   */
  delete(publishedId: string): Promise<boolean>

  /**
   * Validate credentials/connection
   */
  validate(): Promise<boolean>

  /**
   * Get publishing capabilities/limits
   */
  getCapabilities(): PublishingCapabilities
}

export interface PublishContent {
  title: string
  body: string
  mediaUrls?: string[]
  scheduledAt?: Date
  metadata?: Record<string, unknown>
}

export interface PublishingCapabilities {
  maxTitleLength?: number
  maxBodyLength: number
  supportsMedia: boolean
  maxMediaCount?: number
  supportedMediaTypes?: string[]
  supportsScheduling: boolean
  rateLimit?: {
    maxPostsPerHour: number
    maxPostsPerDay: number
  }
}

// ============================================================================
// ANALYTICS ADAPTERS
// ============================================================================

export interface AnalyticsMetrics {
  views: number
  clicks: number
  shares: number
  likes: number
  comments: number
  engagement: number
  customMetrics?: Record<string, number>
}

export interface IAnalyticsAdapter {
  readonly name: string

  /**
   * Fetch analytics for a published post
   */
  fetchMetrics(publishedId: string): Promise<AnalyticsMetrics>

  /**
   * Fetch analytics for multiple posts
   */
  fetchBulkMetrics(publishedIds: string[]): Promise<Map<string, AnalyticsMetrics>>

  /**
   * Fetch channel-level analytics
   */
  fetchChannelMetrics(dateRange: DateRange): Promise<ChannelAnalytics>
}

export interface DateRange {
  start: Date
  end: Date
}

export interface ChannelAnalytics {
  followers: number
  posts: number
  totalReach: number
  totalEngagement: number
  topPosts?: Array<{
    id: string
    metrics: AnalyticsMetrics
  }>
}

// ============================================================================
// NOTIFICATION ADAPTERS
// ============================================================================

export interface NotificationPayload {
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  metadata?: Record<string, unknown>
  actions?: Array<{
    label: string
    url: string
  }>
}

export interface INotificationAdapter {
  readonly name: string

  /**
   * Send a notification
   */
  send(recipients: string[], payload: NotificationPayload): Promise<boolean>

  /**
   * Send to a channel (e.g., Slack channel, Discord server)
   */
  sendToChannel(channelId: string, payload: NotificationPayload): Promise<boolean>
}

// ============================================================================
// STORAGE ADAPTERS
// ============================================================================

export interface UploadResult {
  success: boolean
  url?: string
  thumbnailUrl?: string
  error?: string
  metadata?: Record<string, unknown>
}

export interface IStorageAdapter {
  readonly name: string

  /**
   * Upload a file
   */
  upload(file: File | Buffer, options: UploadOptions): Promise<UploadResult>

  /**
   * Delete a file
   */
  delete(url: string): Promise<boolean>

  /**
   * Get signed URL for temporary access
   */
  getSignedUrl(url: string, expiresIn: number): Promise<string>
}

export interface UploadOptions {
  fileName: string
  contentType: string
  folder?: string
  isPublic?: boolean
  metadata?: Record<string, unknown>
}

// ============================================================================
// AI/LLM ADAPTERS
// ============================================================================

export interface ContentSuggestion {
  type: 'title' | 'body' | 'tags' | 'improvements' | 'hashtags'
  suggestions: string[]
  confidence?: number
  metadata?: Record<string, unknown>
}

export interface IAIAdapter {
  readonly name: string
  readonly model: string

  /**
   * Generate content suggestions
   */
  suggest(prompt: string, context: AIContext): Promise<ContentSuggestion>

  /**
   * Analyze content for optimization
   */
  analyze(content: string, channelType: string): Promise<AIAnalysis>

  /**
   * Generate content from scratch
   */
  generate(instructions: string, context: AIContext): Promise<string>
}

export interface AIContext {
  channelType?: string
  targetAudience?: string
  tone?: string
  existingContent?: string
  constraints?: Record<string, unknown>
}

export interface AIAnalysis {
  score: number // 0-100
  suggestions: string[]
  sentiment?: string
  readabilityScore?: number
  seoScore?: number
  metadata?: Record<string, unknown>
}
