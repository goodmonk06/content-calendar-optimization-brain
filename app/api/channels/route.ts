import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateChannelSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['SNS', 'BLOG', 'EMAIL']),
  metaJson: z.record(z.any()).optional(),
})

// GET /api/channels - List all channels
export async function GET() {
  try {
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

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    )
  }
}

// POST /api/channels - Create a new channel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = CreateChannelSchema.parse(body)

    const channel = await prisma.channel.create({
      data: validated,
    })

    return NextResponse.json({ channel }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating channel:', error)
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    )
  }
}
