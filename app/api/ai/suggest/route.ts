import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const SuggestSchema = z.object({
  contentItemId: z.string().optional(),
  title: z.string().optional(),
  bodyDraft: z.string().optional(),
  channelType: z.enum(['SNS', 'BLOG', 'EMAIL']).optional(),
  suggestionType: z.enum(['title', 'tags', 'improvements']).default('improvements'),
})

// POST /api/ai/suggest - Get AI suggestions for content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = SuggestSchema.parse(body)

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          message: 'Set OPENAI_API_KEY in your environment variables to enable AI suggestions',
        },
        { status: 503 }
      )
    }

    // Dynamic import to avoid errors when OpenAI is not configured
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    let prompt = ''

    if (validated.suggestionType === 'title') {
      prompt = `Given this content draft, suggest 5 engaging titles suitable for ${validated.channelType || 'social media'}:\n\n${validated.bodyDraft}\n\nProvide only the titles, numbered 1-5.`
    } else if (validated.suggestionType === 'tags') {
      prompt = `Analyze this content and suggest relevant tags/topics:\n\nTitle: ${validated.title}\n\nContent: ${validated.bodyDraft}\n\nProvide 5-8 relevant tags as a comma-separated list.`
    } else {
      prompt = `Review this content and suggest improvements for ${validated.channelType || 'general audience'}:\n\nTitle: ${validated.title}\n\nContent: ${validated.bodyDraft}\n\nProvide specific, actionable suggestions to improve engagement and clarity.`
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a content marketing expert helping to optimize content for various channels.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const suggestion = completion.choices[0]?.message?.content || 'No suggestions generated'

    return NextResponse.json({
      suggestion,
      type: validated.suggestionType,
      usage: completion.usage,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error generating AI suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}
