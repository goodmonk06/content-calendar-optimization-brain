# Integration Guide

This guide explains how to integrate the Content Calendar Optimization Brain with other services and systems.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Adapter System](#adapter-system)
- [Event System](#event-system)
- [Common Integration Patterns](#common-integration-patterns)
- [Platform-Specific Guides](#platform-specific-guides)

## Architecture Overview

The Content Calendar Optimization Brain is designed as a **scheduling intelligence layer** that can be integrated into larger ecosystems. It follows a plugin-based architecture using adapters and events.

```
┌─────────────────────────────────────────────────────────────┐
│                   Content Calendar Brain                     │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Core API  │  │ Scheduler  │  │  Event Bus │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│         │               │                │                  │
│  ┌──────▼───────────────▼────────────────▼──────┐         │
│  │          Adapter Registry                     │         │
│  └───────────────────────────────────────────────┘         │
│         │         │         │         │         │           │
└─────────┼─────────┼─────────┼─────────┼─────────┼──────────┘
          │         │         │         │         │
    ┌─────▼───┐ ┌──▼────┐ ┌──▼────┐ ┌──▼────┐ ┌─▼──────┐
    │Publishing│ │Analytics│Storage │ │Notif. │ │  AI    │
    └──────────┘ └─────────┘└────────┘ └───────┘ └────────┘
          │         │         │         │         │
    ┌─────▼─────────▼─────────▼─────────▼─────────▼──────┐
    │       External Services & Platforms                │
    │  (Twitter, Instagram, S3, SendGrid, OpenAI, ...)  │
    └────────────────────────────────────────────────────┘
```

## Adapter System

Adapters provide standardized interfaces for integrating with external services.

### Creating a Publishing Adapter

Example: Twitter Publishing Adapter

```typescript
import { IPublishingAdapter, PublishContent, PublishResult } from '@/lib/adapters/types'
import { TwitterApi } from 'twitter-api-v2'

export class TwitterPublishingAdapter implements IPublishingAdapter {
  readonly name = 'twitter'
  private client: TwitterApi

  constructor(apiKey: string, apiSecret: string, accessToken: string, accessSecret: string) {
    this.client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken,
      accessSecret,
    })
  }

  async publish(content: PublishContent): Promise<PublishResult> {
    try {
      // Truncate if needed
      const text = content.body.substring(0, 280)

      // Upload media if present
      const mediaIds: string[] = []
      if (content.mediaUrls && content.mediaUrls.length > 0) {
        for (const url of content.mediaUrls.slice(0, 4)) {
          const mediaId = await this.uploadMedia(url)
          mediaIds.push(mediaId)
        }
      }

      // Post tweet
      const tweet = await this.client.v2.tweet({
        text,
        media: mediaIds.length > 0 ? { media_ids: mediaIds } : undefined,
      })

      return {
        success: true,
        publishedId: tweet.data.id,
        url: `https://twitter.com/user/status/${tweet.data.id}`,
        metadata: {
          tweetId: tweet.data.id,
          publishedAt: new Date().toISOString(),
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async delete(publishedId: string): Promise<boolean> {
    try {
      await this.client.v2.deleteTweet(publishedId)
      return true
    } catch {
      return false
    }
  }

  async validate(): Promise<boolean> {
    try {
      await this.client.v2.me()
      return true
    } catch {
      return false
    }
  }

  getCapabilities() {
    return {
      maxTitleLength: 280,
      maxBodyLength: 280,
      supportsMedia: true,
      maxMediaCount: 4,
      supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
      supportsScheduling: false, // Twitter API doesn't support native scheduling
      rateLimit: {
        maxPostsPerHour: 50,
        maxPostsPerDay: 300,
      },
    }
  }

  private async uploadMedia(url: string): Promise<string> {
    // Implementation for downloading and uploading media
    // ...
    return 'media_id'
  }
}
```

### Registering the Adapter

```typescript
import { adapterRegistry } from '@/lib/adapters/registry'
import { TwitterPublishingAdapter } from './adapters/twitter'

// In your initialization code
const twitterAdapter = new TwitterPublishingAdapter(
  process.env.TWITTER_API_KEY!,
  process.env.TWITTER_API_SECRET!,
  process.env.TWITTER_ACCESS_TOKEN!,
  process.env.TWITTER_ACCESS_SECRET!
)

adapterRegistry.registerPublishing(twitterAdapter)
```

### Using the Adapter

```typescript
import { adapterRegistry } from '@/lib/adapters/registry'

// Get the adapter
const twitter = adapterRegistry.getPublishing('twitter')

if (twitter) {
  const result = await twitter.publish({
    title: 'Hello World',
    body: 'This is my first tweet from the Content Calendar!',
    mediaUrls: ['https://example.com/image.jpg'],
  })

  if (result.success) {
    console.log('Published:', result.url)
  } else {
    console.error('Failed:', result.error)
  }
}
```

## Event System

The event system allows you to react to actions happening in the Content Calendar.

### Listening to Events

```typescript
import { eventBus, EventTypes } from '@/lib/events'

// Listen for content published events
eventBus.on(EventTypes.CONTENT_PUBLISHED, async event => {
  console.log('Content published!', {
    contentId: event.payload.contentId,
    channelId: event.payload.channelId,
    url: event.payload.publishedUrl,
  })

  // Send notification
  await sendSlackNotification(`Content published: ${event.payload.publishedUrl}`)
})

// Listen for schedule optimized events
eventBus.on(EventTypes.SCHEDULE_OPTIMIZED, event => {
  console.log('Schedule optimized!', {
    slotsCreated: event.payload.slotsCreated,
    score: event.payload.score,
  })
})

// Listen to all events
eventBus.onAny(event => {
  console.log('Event:', event.type, event.payload)
})
```

### Emitting Custom Events

```typescript
import { eventBus } from '@/lib/events'

// Emit a custom event
await eventBus.emit('custom.event', {
  userId: 'user_123',
  action: 'custom_action',
}, {
  source: 'custom_integration',
})
```

## Common Integration Patterns

### Pattern 1: Automated Publishing

Automatically publish content when slots are due.

```typescript
import { prisma } from '@/lib/prisma'
import { adapterRegistry } from '@/lib/adapters/registry'
import { eventBus, EventTypes } from '@/lib/events'

async function publishDueContent() {
  const now = new Date()

  // Find slots due for publishing
  const dueSlots = await prisma.publishingSlot.findMany({
    where: {
      scheduledAt: {
        lte: now,
      },
      status: 'PENDING',
    },
    include: {
      contentItem: true,
      channel: true,
    },
  })

  for (const slot of dueSlots) {
    if (!slot.contentItem) continue

    // Update slot status
    await prisma.publishingSlot.update({
      where: { id: slot.id },
      data: { status: 'PUBLISHING' },
    })

    // Get appropriate adapter
    const channelType = slot.channel.type.toLowerCase()
    const adapter = adapterRegistry.getPublishing(channelType)

    if (!adapter) {
      await prisma.publishingSlot.update({
        where: { id: slot.id },
        data: {
          status: 'FAILED',
          errorMessage: `No adapter found for ${channelType}`,
        },
      })
      continue
    }

    // Publish
    const result = await adapter.publish({
      title: slot.contentItem.title,
      body: slot.contentItem.bodyDraft || '',
      mediaUrls: slot.contentItem.mediaUrls as string[] | undefined,
    })

    if (result.success) {
      // Update slot and content
      await prisma.publishingSlot.update({
        where: { id: slot.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          metaJson: result.metadata,
        },
      })

      await prisma.contentItem.update({
        where: { id: slot.contentItem.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      })

      // Emit event
      await eventBus.emit(EventTypes.CONTENT_PUBLISHED, {
        contentId: slot.contentItem.id,
        slotId: slot.id,
        channelId: slot.channel.id,
        publishedAt: new Date(),
        publishedUrl: result.url,
      })
    } else {
      // Mark as failed
      await prisma.publishingSlot.update({
        where: { id: slot.id },
        data: {
          status: 'FAILED',
          errorMessage: result.error,
        },
      })
    }
  }
}

// Run every minute
setInterval(publishDueContent, 60000)
```

### Pattern 2: Analytics Sync

Periodically fetch analytics from platforms.

```typescript
import { prisma } from '@/lib/prisma'
import { adapterRegistry } from '@/lib/adapters/registry'

async function syncAnalytics() {
  // Get published content from last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const publishedContent = await prisma.contentItem.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: {
        gte: thirtyDaysAgo,
      },
    },
    include: {
      targetChannel: true,
      publishingSlots: true,
    },
  })

  for (const content of publishedContent) {
    const channelType = content.targetChannel.type.toLowerCase()
    const adapter = adapterRegistry.getAnalytics(channelType)

    if (!adapter) continue

    // Get published ID from slot metadata
    const slot = content.publishingSlots.find(s => s.status === 'PUBLISHED')
    if (!slot || !slot.metaJson) continue

    const publishedId = (slot.metaJson as any).publishedId
    if (!publishedId) continue

    // Fetch metrics
    const metrics = await adapter.fetchMetrics(publishedId)

    // Store in database
    await prisma.contentPerformance.create({
      data: {
        contentItemId: content.id,
        views: metrics.views,
        clicks: metrics.clicks,
        shares: metrics.shares,
        likes: metrics.likes,
        comments: metrics.comments,
        engagement: metrics.engagement,
        metadata: metrics.customMetrics,
        recordedAt: new Date(),
      },
    })
  }
}

// Run daily
setInterval(syncAnalytics, 24 * 60 * 60 * 1000)
```

### Pattern 3: Webhook Integration

Expose webhooks for external systems.

```typescript
// app/api/webhooks/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { eventBus, EventTypes } from '@/lib/events'

export async function POST(request: NextRequest) {
  const { slotId } = await request.json()

  const slot = await prisma.publishingSlot.findUnique({
    where: { id: slotId },
    include: {
      contentItem: true,
      channel: true,
    },
  })

  if (!slot) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  }

  // Trigger publishing logic
  // ... (use Pattern 1 logic)

  return NextResponse.json({ success: true })
}
```

## Platform-Specific Guides

### Twitter/X Integration

**Required:**
- Twitter API v2 access
- App credentials (API key, secret)
- User access tokens

**Adapter:** `TwitterPublishingAdapter`
**Features:** Text, images, videos
**Limitations:** No native scheduling

### Instagram Integration

**Required:**
- Instagram Graph API access
- Facebook Business Account
- Instagram Business/Creator Account

**Adapter:** `InstagramPublishingAdapter`
**Features:** Images, videos, carousel
**Limitations:** Requires pre-upload of media

### SendGrid Email Integration

**Required:**
- SendGrid API key

**Adapter:** `SendGridNotificationAdapter`
**Features:** HTML emails, templates
**Use case:** Newsletter distribution

### S3 Storage Integration

**Required:**
- AWS credentials
- S3 bucket

**Adapter:** `S3StorageAdapter`
**Features:** Image/video storage, signed URLs

### OpenAI Integration

**Already integrated** via `/api/ai/suggest`

**Extend with adapter:**
```typescript
export class OpenAIAdapter implements IAIAdapter {
  readonly name = 'openai'
  readonly model = 'gpt-4o-mini'

  // ... implementation
}
```

## Best Practices

1. **Error Handling**: Always handle adapter failures gracefully
2. **Rate Limiting**: Respect platform rate limits
3. **Retries**: Implement exponential backoff for failed publishes
4. **Monitoring**: Use the metrics system to track adapter performance
5. **Testing**: Test adapters with mock data before production
6. **Security**: Never commit credentials; use environment variables
7. **Logging**: Log all external API calls for debugging

## Troubleshooting

**Adapter not found:**
- Ensure adapter is registered in `adapterRegistry`
- Check adapter name matches channel type

**Publishing fails:**
- Verify credentials are correct
- Check platform rate limits
- Review error messages in slot.errorMessage

**Events not firing:**
- Confirm event handlers are registered before events are emitted
- Check event type constants match

## Further Reading

- [Adapter Types Reference](../lib/adapters/types.ts)
- [Event Types Reference](../lib/events/types.ts)
- [Phase 3 Overview](./PHASE3_OVERVIEW.md)
