/**
 * Metrics Collection Utility
 * Collects and tracks application metrics
 */

import { logger } from './logger'

export interface Metric {
  name: string
  value: number
  type: MetricType
  labels?: Record<string, string>
  timestamp: Date
}

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary'

export interface MetricSummary {
  count: number
  sum: number
  min: number
  max: number
  avg: number
}

class MetricsCollector {
  private static instance: MetricsCollector
  private metrics: Map<string, Metric[]> = new Map()
  private counters: Map<string, number> = new Map()
  private gauges: Map<string, number> = new Map()
  private maxMetricsPerName = 1000

  private constructor() {}

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector()
    }
    return MetricsCollector.instance
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels)
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + value)

    this.recordMetric({
      name,
      value,
      type: 'counter',
      labels,
      timestamp: new Date(),
    })

    logger.debug('Counter incremented', { name, value, labels })
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels)
    this.gauges.set(key, value)

    this.recordMetric({
      name,
      value,
      type: 'gauge',
      labels,
      timestamp: new Date(),
    })

    logger.debug('Gauge set', { name, value, labels })
  }

  /**
   * Record a histogram value (e.g., latency, size)
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      type: 'histogram',
      labels,
      timestamp: new Date(),
    })

    logger.debug('Histogram recorded', { name, value, labels })
  }

  /**
   * Record timing (wrapper for histogram)
   */
  recordTiming(name: string, durationMs: number, labels?: Record<string, string>): void {
    this.recordHistogram(name, durationMs, labels)
  }

  /**
   * Time a function execution
   */
  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const start = Date.now()
    try {
      return await fn()
    } finally {
      const duration = Date.now() - start
      this.recordTiming(name, duration, labels)
    }
  }

  /**
   * Time a synchronous function
   */
  timeSync<T>(name: string, fn: () => T, labels?: Record<string, string>): T {
    const start = Date.now()
    try {
      return fn()
    } finally {
      const duration = Date.now() - start
      this.recordTiming(name, duration, labels)
    }
  }

  /**
   * Get current counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.getMetricKey(name, labels)
    return this.counters.get(key) || 0
  }

  /**
   * Get current gauge value
   */
  getGauge(name: string, labels?: Record<string, string>): number | undefined {
    const key = this.getMetricKey(name, labels)
    return this.gauges.get(key)
  }

  /**
   * Get metric summary for a name
   */
  getSummary(name: string): MetricSummary | null {
    const metrics = this.metrics.get(name)
    if (!metrics || metrics.length === 0) {
      return null
    }

    const values = metrics.map(m => m.value)
    const sum = values.reduce((a, b) => a + b, 0)

    return {
      count: values.length,
      sum,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
    }
  }

  /**
   * Get all metrics for a name
   */
  getMetrics(name: string, limit?: number): Metric[] {
    const metrics = this.metrics.get(name) || []
    if (limit) {
      return metrics.slice(-limit)
    }
    return [...metrics]
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys())
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear()
    this.counters.clear()
    this.gauges.clear()
    logger.info('Metrics cleared')
  }

  /**
   * Clear metrics for a specific name
   */
  clearMetric(name: string): void {
    this.metrics.delete(name)

    // Clear related counters and gauges
    const keysToDelete: string[] = []
    this.counters.forEach((_, key) => {
      if (key.startsWith(name)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.counters.delete(key))

    keysToDelete.length = 0
    this.gauges.forEach((_, key) => {
      if (key.startsWith(name)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.gauges.delete(key))

    logger.info('Metrics cleared for name', { name })
  }

  /**
   * Get statistics
   */
  getStats(): MetricsStats {
    return {
      totalMetrics: Array.from(this.metrics.values()).reduce((sum, arr) => sum + arr.length, 0),
      metricNames: this.metrics.size,
      counters: this.counters.size,
      gauges: this.gauges.size,
    }
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = []

    // Export counters
    this.counters.forEach((value, key) => {
      lines.push(`${key} ${value}`)
    })

    // Export gauges
    this.gauges.forEach((value, key) => {
      lines.push(`${key} ${value}`)
    })

    return lines.join('\n')
  }

  private recordMetric(metric: Metric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, [])
    }

    const metricArray = this.metrics.get(metric.name)!
    metricArray.push(metric)

    // Limit metrics per name to prevent memory issues
    if (metricArray.length > this.maxMetricsPerName) {
      metricArray.shift()
    }
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) {
      return name
    }

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',')

    return `${name}{${labelStr}}`
  }
}

export interface MetricsStats {
  totalMetrics: number
  metricNames: number
  counters: number
  gauges: number
}

// Singleton instance export
export const metrics = MetricsCollector.getInstance()

// Convenience functions
export const incrementCounter = (name: string, value?: number, labels?: Record<string, string>) =>
  metrics.incrementCounter(name, value, labels)

export const setGauge = (name: string, value: number, labels?: Record<string, string>) =>
  metrics.setGauge(name, value, labels)

export const recordHistogram = (name: string, value: number, labels?: Record<string, string>) =>
  metrics.recordHistogram(name, value, labels)

export const recordTiming = (name: string, durationMs: number, labels?: Record<string, string>) =>
  metrics.recordTiming(name, durationMs, labels)

export const timeAsync = <T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>) =>
  metrics.timeAsync(name, fn, labels)

export const timeSync = <T>(name: string, fn: () => T, labels?: Record<string, string>) =>
  metrics.timeSync(name, fn, labels)
