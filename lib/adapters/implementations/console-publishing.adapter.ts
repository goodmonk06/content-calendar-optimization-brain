/**
 * Console Publishing Adapter
 * A no-op adapter that logs publish attempts to console
 * Useful for development and testing
 */

import {
  IPublishingAdapter,
  PublishContent,
  PublishResult,
  PublishingCapabilities,
} from '../types'
import { logger } from '../../logger'

export class ConsolePublishingAdapter implements IPublishingAdapter {
  readonly name = 'console'

  async publish(content: PublishContent): Promise<PublishResult> {
    logger.info('📤 [Console Publisher] Publishing content', {
      title: content.title,
      bodyLength: content.body.length,
      mediaCount: content.mediaUrls?.length || 0,
      scheduledAt: content.scheduledAt,
    })

    // Simulate publishing delay
    await new Promise(resolve => setTimeout(resolve, 100))

    const publishedId = `console_${Date.now()}_${Math.random().toString(36).substring(7)}`

    logger.info('✅ [Console Publisher] Content published successfully', {
      publishedId,
      title: content.title,
    })

    return {
      success: true,
      publishedId,
      url: `https://console.example.com/posts/${publishedId}`,
      metadata: {
        publishedAt: new Date().toISOString(),
      },
    }
  }

  async delete(publishedId: string): Promise<boolean> {
    logger.info('🗑️  [Console Publisher] Deleting content', { publishedId })
    await new Promise(resolve => setTimeout(resolve, 50))
    return true
  }

  async validate(): Promise<boolean> {
    logger.info('✓ [Console Publisher] Validation successful')
    return true
  }

  getCapabilities(): PublishingCapabilities {
    return {
      maxTitleLength: 280,
      maxBodyLength: 10000,
      supportsMedia: true,
      maxMediaCount: 4,
      supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
      supportsScheduling: true,
      rateLimit: {
        maxPostsPerHour: 100,
        maxPostsPerDay: 500,
      },
    }
  }
}
