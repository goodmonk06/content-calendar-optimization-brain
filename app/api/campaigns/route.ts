import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { handleApiError } from '@/lib/errors'
import { eventBus, EventTypes } from '@/lib/events'
import { z } from 'zod'

const CreateCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  teamId: z.string().optional(),
  creatorId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  goals: z.record(z.any()).optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).default('PLANNING'),
})

// GET /api/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const teamId = searchParams.get('teamId')

    const where: any = {}
    if (status) {
      where.status = status
    }
    if (teamId) {
      where.teamId = teamId
    }

    logger.info('Fetching campaigns', { status, teamId })

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        team: true,
        creator: true,
        _count: {
          select: {
            contentItems: true,
          },
        },
      },
    })

    logger.info('Successfully fetched campaigns', { count: campaigns.length })
    return NextResponse.json({ campaigns })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = CreateCampaignSchema.parse(body)

    logger.info('Creating new campaign', { name: validated.name })

    const campaign = await prisma.campaign.create({
      data: {
        name: validated.name,
        description: validated.description,
        teamId: validated.teamId,
        creatorId: validated.creatorId,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        endDate: validated.endDate ? new Date(validated.endDate) : undefined,
        goals: validated.goals,
        status: validated.status,
      },
      include: {
        team: true,
        creator: true,
      },
    })

    // Emit event
    await eventBus.emit(EventTypes.CAMPAIGN_CREATED, {
      campaignId: campaign.id,
      name: campaign.name,
      creatorId: campaign.creatorId,
      teamId: campaign.teamId,
    })

    logger.info('Successfully created campaign', { id: campaign.id })
    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
