import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateContentItemSchema = z.object({
  title: z.string().min(1).optional(),
  bodyDraft: z.string().optional(),
  targetChannelId: z.string().optional(),
  tagsJson: z.array(z.string()).optional(),
  status: z.enum(['IDEA', 'DRAFT', 'READY', 'SCHEDULED', 'PUBLISHED']).optional(),
})

// GET /api/content-items/[id] - Get a single content item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: params.id },
      include: {
        targetChannel: true,
        publishingSlots: {
          orderBy: { scheduledAt: 'asc' },
        },
      },
    })

    if (!contentItem) {
      return NextResponse.json(
        { error: 'Content item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ contentItem })
  } catch (error) {
    console.error('Error fetching content item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content item' },
      { status: 500 }
    )
  }
}

// PUT /api/content-items/[id] - Update a content item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validated = UpdateContentItemSchema.parse(body)

    // If targetChannelId is being updated, verify it exists
    if (validated.targetChannelId) {
      const channel = await prisma.channel.findUnique({
        where: { id: validated.targetChannelId },
      })

      if (!channel) {
        return NextResponse.json(
          { error: 'Target channel not found' },
          { status: 404 }
        )
      }
    }

    const contentItem = await prisma.contentItem.update({
      where: { id: params.id },
      data: validated,
      include: {
        targetChannel: true,
      },
    })

    return NextResponse.json({ contentItem })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating content item:', error)
    return NextResponse.json(
      { error: 'Failed to update content item' },
      { status: 500 }
    )
  }
}

// DELETE /api/content-items/[id] - Delete a content item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.contentItem.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting content item:', error)
    return NextResponse.json(
      { error: 'Failed to delete content item' },
      { status: 500 }
    )
  }
}
