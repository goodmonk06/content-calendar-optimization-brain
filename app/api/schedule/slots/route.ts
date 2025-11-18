import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

// GET /api/schedule/slots - Get publishing slots with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (channelId) {
      where.channelId = channelId
    }

    if (startDate || endDate) {
      where.scheduledAt = {}
      if (startDate) {
        where.scheduledAt.gte = startOfDay(new Date(startDate))
      }
      if (endDate) {
        where.scheduledAt.lte = endOfDay(new Date(endDate))
      }
    }

    const slots = await prisma.publishingSlot.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        channel: true,
        contentItem: true,
      },
    })

    return NextResponse.json({ slots })
  } catch (error) {
    console.error('Error fetching slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch slots' },
      { status: 500 }
    )
  }
}
