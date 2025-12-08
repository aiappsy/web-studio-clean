import { NextRequest, NextResponse } from 'next/server'
import { safe, withValidation, logRequest, logResponse } from '@/lib/errors'
import { EditPageSchema } from '@/lib/schemas'
import { agentRunner } from '@/agents/runner'
import { rateLimit, sanitizePrompt } from '@/lib/security'

// Rate limiting for AI edits
const editRateLimit = rateLimit({
  limit: 15, // 15 edits per 15 minutes
  windowMs: 15 * 60 * 1000,
})

export const POST = safe(async (request: NextRequest) => {
  // Apply rate limiting
  await editRateLimit(request)

  // Validate input
  const body = await request.json()
  const { pageId, instruction, currentContent, model } = withValidation(EditPageSchema, body)

  // Sanitize user input
  const sanitizedInstruction = sanitizePrompt(instruction)

  logRequest(request, {
    operation: 'ai-edit',
    pageId,
    instruction: sanitizedInstruction,
    model,
  })

  const executionId = crypto.randomUUID()

  try {
    // Determine which agent to use based on instruction
    let agentName = 'content-writer'
    
    if (sanitizedInstruction.toLowerCase().includes('layout') || 
        sanitizedInstruction.toLowerCase().includes('design') ||
        sanitizedInstruction.toLowerCase().includes('theme') ||
        sanitizedInstruction.toLowerCase().includes('color') ||
        sanitizedInstruction.toLowerCase().includes('style')) {
      agentName = 'layout-designer'
    } else if (sanitizedInstruction.toLowerCase().includes('export') ||
               sanitizedInstruction.toLowerCase().includes('compile') ||
               sanitizedInstruction.toLowerCase().includes('build')) {
      agentName = 'export-compiler'
    }

    // Execute the appropriate agent
    const result = await agentRunner.runAgent(agentName, {
      pageType: pageId,
      businessDescription: 'Website content update',
      instruction: sanitizedInstruction,
      existingContent: currentContent,
      targetAudience: 'website visitors',
    })

    if (!result.success) {
      throw new Error(`AI edit failed: ${result.error}`)
    }

    const response = NextResponse.json({
      success: true,
      updatedPage: {
        id: pageId,
        content: result.data,
      },
      executionId,
      agent: agentName,
      message: 'Content updated successfully',
    })

    logResponse(response, { executionId, pageId, agentName })
    return response

  } catch (error) {
    console.error('AI edit error:', error)
    
    const response = NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionId,
    }, { status: 500 })

    logResponse(response, { executionId, error: error instanceof Error ? error.message : 'Unknown error' })
    return response
  }
})