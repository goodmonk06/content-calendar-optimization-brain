'use client'

import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { useState } from 'react'

interface PublishingSlot {
  id: string
  scheduledAt: string
  contentItem?: {
    id: string
    title: string
    status: string
  }
  channel: {
    id: string
    name: string
    type: string
  }
}

interface CalendarProps {
  slots: PublishingSlot[]
  onSlotClick?: (slot: PublishingSlot) => void
}

export default function Calendar({ slots, onSlotClick }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getSlotsForDay = (day: Date) => {
    return slots.filter(slot =>
      isSameDay(new Date(slot.scheduledAt), day)
    )
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button onClick={goToPreviousMonth} className="nav-button">
          ← Previous
        </button>
        <h2>{format(currentMonth, 'MMMM yyyy')}</h2>
        <button onClick={goToNextMonth} className="nav-button">
          Next →
        </button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}

        {daysInMonth.map(day => {
          const daySlots = getSlotsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)

          return (
            <div
              key={day.toISOString()}
              className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''}`}
            >
              <div className="day-number">{format(day, 'd')}</div>
              <div className="day-slots">
                {daySlots.map(slot => (
                  <div
                    key={slot.id}
                    className={`slot slot-${slot.channel.type.toLowerCase()}`}
                    onClick={() => onSlotClick?.(slot)}
                    title={slot.contentItem?.title || 'Empty slot'}
                  >
                    <div className="slot-time">
                      {format(new Date(slot.scheduledAt), 'HH:mm')}
                    </div>
                    <div className="slot-channel">{slot.channel.name}</div>
                    {slot.contentItem && (
                      <div className="slot-title">
                        {slot.contentItem.title.substring(0, 30)}
                        {slot.contentItem.title.length > 30 ? '...' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .calendar {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .calendar-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        .nav-button {
          padding: 8px 16px;
          background: #f0f0f0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .nav-button:hover {
          background: #e0e0e0;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: #e0e0e0;
          border: 1px solid #e0e0e0;
        }

        .calendar-day-header {
          background: #f8f8f8;
          padding: 10px;
          text-align: center;
          font-weight: 600;
          font-size: 14px;
        }

        .calendar-day {
          background: white;
          min-height: 120px;
          padding: 8px;
        }

        .calendar-day.other-month {
          background: #fafafa;
          opacity: 0.5;
        }

        .day-number {
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .day-slots {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .slot {
          padding: 6px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .slot:hover {
          transform: scale(1.05);
        }

        .slot-sns {
          background: #e3f2fd;
          border-left: 3px solid #2196f3;
        }

        .slot-blog {
          background: #f3e5f5;
          border-left: 3px solid #9c27b0;
        }

        .slot-email {
          background: #fff3e0;
          border-left: 3px solid #ff9800;
        }

        .slot-time {
          font-weight: 600;
          margin-bottom: 2px;
        }

        .slot-channel {
          color: #666;
          margin-bottom: 2px;
        }

        .slot-title {
          font-weight: 500;
          line-height: 1.3;
        }
      `}</style>
    </div>
  )
}
