/**
 * Adapter Registry for managing pluggable adapters
 * This allows runtime registration and retrieval of adapters
 */

import {
  IPublishingAdapter,
  IAnalyticsAdapter,
  INotificationAdapter,
  IStorageAdapter,
  IAIAdapter,
} from './types'
import { logger } from '../logger'

export class AdapterRegistry {
  private static instance: AdapterRegistry
  private publishingAdapters: Map<string, IPublishingAdapter> = new Map()
  private analyticsAdapters: Map<string, IAnalyticsAdapter> = new Map()
  private notificationAdapters: Map<string, INotificationAdapter> = new Map()
  private storageAdapters: Map<string, IStorageAdapter> = new Map()
  private aiAdapters: Map<string, IAIAdapter> = new Map()

  private constructor() {}

  static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry()
    }
    return AdapterRegistry.instance
  }

  // ============================================================================
  // PUBLISHING ADAPTERS
  // ============================================================================

  registerPublishing(adapter: IPublishingAdapter): void {
    logger.info('Registering publishing adapter', { name: adapter.name })
    this.publishingAdapters.set(adapter.name, adapter)
  }

  getPublishing(name: string): IPublishingAdapter | undefined {
    return this.publishingAdapters.get(name)
  }

  getAllPublishing(): IPublishingAdapter[] {
    return Array.from(this.publishingAdapters.values())
  }

  // ============================================================================
  // ANALYTICS ADAPTERS
  // ============================================================================

  registerAnalytics(adapter: IAnalyticsAdapter): void {
    logger.info('Registering analytics adapter', { name: adapter.name })
    this.analyticsAdapters.set(adapter.name, adapter)
  }

  getAnalytics(name: string): IAnalyticsAdapter | undefined {
    return this.analyticsAdapters.get(name)
  }

  getAllAnalytics(): IAnalyticsAdapter[] {
    return Array.from(this.analyticsAdapters.values())
  }

  // ============================================================================
  // NOTIFICATION ADAPTERS
  // ============================================================================

  registerNotification(adapter: INotificationAdapter): void {
    logger.info('Registering notification adapter', { name: adapter.name })
    this.notificationAdapters.set(adapter.name, adapter)
  }

  getNotification(name: string): INotificationAdapter | undefined {
    return this.notificationAdapters.get(name)
  }

  getAllNotifications(): INotificationAdapter[] {
    return Array.from(this.notificationAdapters.values())
  }

  // ============================================================================
  // STORAGE ADAPTERS
  // ============================================================================

  registerStorage(adapter: IStorageAdapter): void {
    logger.info('Registering storage adapter', { name: adapter.name })
    this.storageAdapters.set(adapter.name, adapter)
  }

  getStorage(name: string): IStorageAdapter | undefined {
    return this.storageAdapters.get(name)
  }

  getAllStorage(): IStorageAdapter[] {
    return Array.from(this.storageAdapters.values())
  }

  // ============================================================================
  // AI ADAPTERS
  // ============================================================================

  registerAI(adapter: IAIAdapter): void {
    logger.info('Registering AI adapter', { name: adapter.name, model: adapter.model })
    this.aiAdapters.set(adapter.name, adapter)
  }

  getAI(name: string): IAIAdapter | undefined {
    return this.aiAdapters.get(name)
  }

  getAllAI(): IAIAdapter[] {
    return Array.from(this.aiAdapters.values())
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  clear(): void {
    this.publishingAdapters.clear()
    this.analyticsAdapters.clear()
    this.notificationAdapters.clear()
    this.storageAdapters.clear()
    this.aiAdapters.clear()
    logger.info('Cleared all adapter registrations')
  }

  getStats(): AdapterStats {
    return {
      publishing: this.publishingAdapters.size,
      analytics: this.analyticsAdapters.size,
      notifications: this.notificationAdapters.size,
      storage: this.storageAdapters.size,
      ai: this.aiAdapters.size,
      total:
        this.publishingAdapters.size +
        this.analyticsAdapters.size +
        this.notificationAdapters.size +
        this.storageAdapters.size +
        this.aiAdapters.size,
    }
  }
}

export interface AdapterStats {
  publishing: number
  analytics: number
  notifications: number
  storage: number
  ai: number
  total: number
}

// Singleton instance export
export const adapterRegistry = AdapterRegistry.getInstance()
