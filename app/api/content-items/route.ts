import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateContentItemSchema = z.object({
  title: z.string().min(1),
  bodyDraft: z.string().optional(),
  targetChannelId: z.string(),
  tagsJson: z.array(z.string()).optional(),
  status: z.enum(['IDEA', 'DRAFT', 'READY', 'SCHEDULED', 'PUBLISHED']).default('IDEA'),
})

// GET /api/content-items - List content items with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const channelId = searchParams.get('channelId')

    const where: any = {}
    if (status) {
      where.status = status
    }
    if (channelId) {
      where.targetChannelId = channelId
    }

    const contentItems = await prisma.contentItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        targetChannel: true,
        publishingSlots: {
          orderBy: { scheduledAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ contentItems })
  } catch (error) {
    console.error('Error fetching content items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content items' },
      { status: 500 }
    )
  }
}

// POST /api/content-items - Create a new content item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = CreateContentItemSchema.parse(body)

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: validated.targetChannelId },
    })

    if (!channel) {
      return NextResponse.json(
        { error: 'Target channel not found' },
        { status: 404 }
      )
    }

    const contentItem = await prisma.contentItem.create({
      data: {
        title: validated.title,
        bodyDraft: validated.bodyDraft,
        targetChannelId: validated.targetChannelId,
        tagsJson: validated.tagsJson,
        status: validated.status,
      },
      include: {
        targetChannel: true,
      },
    })

    return NextResponse.json({ contentItem }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating content item:', error)
    return NextResponse.json(
      { error: 'Failed to create content item' },
      { status: 500 }
    )
  }
}
