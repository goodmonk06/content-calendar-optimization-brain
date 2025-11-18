import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { handleApiError } from '@/lib/errors'
import { z } from 'zod'

const CreateChannelSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['SNS', 'BLOG', 'EMAIL']),
  metaJson: z.record(z.any()).optional(),
})

// GET /api/channels - List all channels
export async function GET() {
  try {
    logger.info('Fetching all channels')

    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            contentItems: true,
            publishingSlots: true,
          },
        },
      },
    })

    logger.info('Successfully fetched channels', { count: channels.length })
    return NextResponse.json({ channels })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/channels - Create a new channel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = CreateChannelSchema.parse(body)

    logger.info('Creating new channel', { name: validated.name, type: validated.type })

    const channel = await prisma.channel.create({
      data: validated,
    })

    logger.info('Successfully created channel', { id: channel.id })
    return NextResponse.json({ channel }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
