/**
 * Event Bus for Pub/Sub pattern
 * Allows components to emit and listen to domain events
 */

import { DomainEvent, EventType } from './types'
import { logger } from '../logger'

type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>

export class EventBus {
  private static instance: EventBus
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private eventHistory: DomainEvent[] = []
  private maxHistorySize = 1000

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  /**
   * Subscribe to an event type
   */
  on<T = unknown>(eventType: EventType | string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }

    this.handlers.get(eventType)!.add(handler as EventHandler)

    logger.debug('Event handler registered', { eventType })

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler)
    }
  }

  /**
   * Unsubscribe from an event type
   */
  off<T = unknown>(eventType: EventType | string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      handlers.delete(handler as EventHandler)
      if (handlers.size === 0) {
        this.handlers.delete(eventType)
      }
      logger.debug('Event handler unregistered', { eventType })
    }
  }

  /**
   * Emit an event
   */
  async emit<T = unknown>(eventType: EventType | string, payload: T, metadata?: Record<string, unknown>): Promise<void> {
    const event: DomainEvent<T> = {
      type: eventType,
      timestamp: new Date(),
      payload,
      metadata,
    }

    // Add to history
    this.eventHistory.push(event)
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }

    logger.info('Event emitted', {
      type: eventType,
      hasMetadata: !!metadata,
    })

    // Get handlers for this event type
    const handlers = this.handlers.get(eventType)
    if (!handlers || handlers.size === 0) {
      logger.debug('No handlers registered for event', { eventType })
      return
    }

    // Execute all handlers
    const promises = Array.from(handlers).map(async handler => {
      try {
        await handler(event)
      } catch (error) {
        logger.error('Error in event handler', error, {
          eventType,
          handlerName: handler.name,
        })
      }
    })

    await Promise.all(promises)
  }

  /**
   * Subscribe to all events
   */
  onAny(handler: EventHandler): () => void {
    return this.on('*', handler)
  }

  /**
   * Get event history
   */
  getHistory(limit?: number): DomainEvent[] {
    if (limit) {
      return this.eventHistory.slice(-limit)
    }
    return [...this.eventHistory]
  }

  /**
   * Get event history filtered by type
   */
  getHistoryByType(eventType: EventType | string, limit?: number): DomainEvent[] {
    const filtered = this.eventHistory.filter(e => e.type === eventType)
    if (limit) {
      return filtered.slice(-limit)
    }
    return filtered
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = []
    logger.info('Event history cleared')
  }

  /**
   * Remove all handlers
   */
  clearHandlers(): void {
    this.handlers.clear()
    logger.info('All event handlers cleared')
  }

  /**
   * Get statistics
   */
  getStats(): EventBusStats {
    const handlersByType: Record<string, number> = {}
    this.handlers.forEach((handlers, type) => {
      handlersByType[type] = handlers.size
    })

    return {
      totalHandlers: Array.from(this.handlers.values()).reduce((sum, set) => sum + set.size, 0),
      eventTypes: this.handlers.size,
      historySize: this.eventHistory.length,
      handlersByType,
    }
  }
}

export interface EventBusStats {
  totalHandlers: number
  eventTypes: number
  historySize: number
  handlersByType: Record<string, number>
}

// Singleton instance export
export const eventBus = EventBus.getInstance()
