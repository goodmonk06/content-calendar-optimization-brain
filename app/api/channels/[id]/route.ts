import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['SNS', 'BLOG', 'EMAIL']).optional(),
  metaJson: z.record(z.any()).optional(),
})

// GET /api/channels/[id] - Get a single channel
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: params.id },
      include: {
        contentItems: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        publishingSlots: {
          where: {
            scheduledAt: {
              gte: new Date(),
            },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 20,
          include: {
            contentItem: true,
          },
        },
      },
    })

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ channel })
  } catch (error) {
    console.error('Error fetching channel:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channel' },
      { status: 500 }
    )
  }
}

// PUT /api/channels/[id] - Update a channel
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validated = UpdateChannelSchema.parse(body)

    const channel = await prisma.channel.update({
      where: { id: params.id },
      data: validated,
    })

    return NextResponse.json({ channel })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating channel:', error)
    return NextResponse.json(
      { error: 'Failed to update channel' },
      { status: 500 }
    )
  }
}

// DELETE /api/channels/[id] - Delete a channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.channel.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting channel:', error)
    return NextResponse.json(
      { error: 'Failed to delete channel' },
      { status: 500 }
    )
  }
}
