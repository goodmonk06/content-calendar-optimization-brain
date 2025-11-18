import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { handleApiError, NotFoundError } from '@/lib/errors'
import { eventBus, EventTypes } from '@/lib/events'
import { z } from 'zod'

const UpdateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  goals: z.record(z.any()).optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
})

// GET /api/campaigns/[id] - Get a single campaign
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info('Fetching campaign', { id: params.id })

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        team: true,
        creator: true,
        contentItems: {
          include: {
            targetChannel: true,
            publishingSlots: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!campaign) {
      throw new NotFoundError('Campaign', params.id)
    }

    logger.info('Successfully fetched campaign', { id: params.id })
    return NextResponse.json({ campaign })
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/campaigns/[id] - Update a campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validated = UpdateCampaignSchema.parse(body)

    logger.info('Updating campaign', { id: params.id })

    // Get current campaign for event
    const currentCampaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    })

    if (!currentCampaign) {
      throw new NotFoundError('Campaign', params.id)
    }

    const updateData: any = {}
    if (validated.name) updateData.name = validated.name
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.startDate) updateData.startDate = new Date(validated.startDate)
    if (validated.endDate) updateData.endDate = new Date(validated.endDate)
    if (validated.goals) updateData.goals = validated.goals
    if (validated.status) updateData.status = validated.status

    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: updateData,
      include: {
        team: true,
        creator: true,
      },
    })

    // Emit event if status changed
    if (validated.status && validated.status !== currentCampaign.status) {
      await eventBus.emit(EventTypes.CAMPAIGN_STATUS_CHANGED, {
        campaignId: campaign.id,
        previousStatus: currentCampaign.status,
        newStatus: campaign.status,
      })
    }

    logger.info('Successfully updated campaign', { id: campaign.id })
    return NextResponse.json({ campaign })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/campaigns/[id] - Delete a campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info('Deleting campaign', { id: params.id })

    await prisma.campaign.delete({
      where: { id: params.id },
    })

    logger.info('Successfully deleted campaign', { id: params.id })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
