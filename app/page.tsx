'use client'

import { useEffect, useState } from 'react'
import Calendar from '@/components/Calendar'

interface Channel {
  id: string
  name: string
  type: string
}

interface ContentItem {
  id: string
  title: string
  status: string
  targetChannel: Channel
}

interface PublishingSlot {
  id: string
  scheduledAt: string
  contentItem?: {
    id: string
    title: string
    status: string
  }
  channel: Channel
}

export default function Dashboard() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [slots, setSlots] = useState<PublishingSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [channelsRes, itemsRes, slotsRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/content-items'),
        fetch('/api/schedule/slots'),
      ])

      const channelsData = await channelsRes.json()
      const itemsData = await itemsRes.json()
      const slotsData = await slotsRes.json()

      setChannels(channelsData.channels || [])
      setContentItems(itemsData.contentItems || [])
      setSlots(slotsData.slots || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAutoSchedule = async () => {
    setScheduling(true)
    try {
      const response = await fetch('/api/schedule/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysToSchedule: 30,
          maxPostsPerDayPerChannel: 2,
          avoidConsecutiveSameTag: true,
        }),
      })

      const result = await response.json()
      alert(`Schedule created! ${result.slotsCreated} slots generated for ${result.itemsScheduled} items.`)

      // Refresh data
      await fetchData()
    } catch (error) {
      console.error('Error scheduling:', error)
      alert('Failed to generate schedule')
    } finally {
      setScheduling(false)
    }
  }

  const getStatusCounts = () => {
    return {
      idea: contentItems.filter(i => i.status === 'IDEA').length,
      draft: contentItems.filter(i => i.status === 'DRAFT').length,
      ready: contentItems.filter(i => i.status === 'READY').length,
      scheduled: contentItems.filter(i => i.status === 'SCHEDULED').length,
      published: contentItems.filter(i => i.status === 'PUBLISHED').length,
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="container">
      <header className="header">
        <h1>Content Calendar Optimizer</h1>
        <p className="subtitle">Orchestrate your multi-channel content strategy</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Channels</div>
          <div className="stat-value">{channels.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Content</div>
          <div className="stat-value">{contentItems.length}</div>
        </div>
        <div className="stat-card stat-ready">
          <div className="stat-label">Ready to Schedule</div>
          <div className="stat-value">{statusCounts.ready}</div>
        </div>
        <div className="stat-card stat-scheduled">
          <div className="stat-label">Scheduled</div>
          <div className="stat-value">{statusCounts.scheduled}</div>
        </div>
      </div>

      <div className="actions">
        <button
          onClick={handleAutoSchedule}
          disabled={scheduling || statusCounts.ready === 0}
          className="btn-primary"
        >
          {scheduling ? 'Scheduling...' : `Auto-Schedule (${statusCounts.ready} ready items)`}
        </button>
        <button onClick={fetchData} className="btn-secondary">
          Refresh
        </button>
      </div>

      <div className="channels-section">
        <h2>Channels</h2>
        <div className="channels-grid">
          {channels.map(channel => (
            <div key={channel.id} className={`channel-card channel-${channel.type.toLowerCase()}`}>
              <h3>{channel.name}</h3>
              <div className="channel-type">{channel.type}</div>
            </div>
          ))}
          {channels.length === 0 && (
            <div className="empty-state">
              No channels yet. Run the seed script to get started!
            </div>
          )}
        </div>
      </div>

      <div className="calendar-section">
        <h2>Publishing Schedule</h2>
        <Calendar slots={slots} />
      </div>

      <div className="content-section">
        <h2>Content Items by Status</h2>
        <div className="status-tabs">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="status-tab">
              <span className="status-name">{status.toUpperCase()}</span>
              <span className="status-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .loading {
          text-align: center;
          padding: 60px;
          font-size: 18px;
          color: #666;
        }

        .header {
          margin-bottom: 40px;
        }

        .header h1 {
          margin: 0 0 8px 0;
          font-size: 36px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .subtitle {
          margin: 0;
          font-size: 16px;
          color: #666;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .stat-card.stat-ready {
          border-left: 4px solid #4caf50;
        }

        .stat-card.stat-scheduled {
          border-left: 4px solid #2196f3;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .actions {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
        }

        .btn-primary, .btn-secondary {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #2196f3;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1976d2;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .channels-section, .calendar-section, .content-section {
          margin-bottom: 40px;
        }

        h2 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #1a1a1a;
        }

        .channels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
        }

        .channel-card {
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .channel-card h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .channel-type {
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
          opacity: 0.7;
        }

        .channel-sns {
          background: #e3f2fd;
          color: #1565c0;
        }

        .channel-blog {
          background: #f3e5f5;
          color: #6a1b9a;
        }

        .channel-email {
          background: #fff3e0;
          color: #e65100;
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          color: #666;
          background: #f8f8f8;
          border-radius: 8px;
        }

        .status-tabs {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .status-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: white;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .status-name {
          font-weight: 600;
          font-size: 14px;
          color: #666;
        }

        .status-count {
          background: #2196f3;
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
