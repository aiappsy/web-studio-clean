import { NextRequest, NextResponse } from 'next/server'
import { safe, logRequest, logResponse, addSecurityHeaders } from '@/lib/errors'
import { TelemetryService } from '@/lib/telemetry'
import { rateLimit } from '@/lib/security'

// Rate limiting for analytics
const analyticsRateLimit = rateLimit({
  limit: 100, // 100 requests per minute
  windowMs: 60 * 1000,
})

export const GET = safe(async (request: NextRequest) => {
  // Apply rate limiting
  await analyticsRateLimit(request)

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const projectId = searchParams.get('projectId')
  const timeRange = searchParams.get('timeRange') || '7d'

  logRequest(request, {
    operation: 'get-analytics',
    userId,
    projectId,
    timeRange,
  })

  try {
    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get analytics data
    const [
      aiUsage,
      dashboardData,
      agentPerformance
    ] = await Promise.all([
        TelemetryService.getAIUsage(userId, projectId, { start: startDate, end: now }),
        TelemetryService.getDashboardData(),
        // Get performance for top agents
        ...['website-architect', 'content-writer', 'layout-designer'].map(agent => 
          TelemetryService.getAgentPerformance(agent)
        )
      ])

    const response = NextResponse.json({
      success: true,
      data: {
        timeRange,
        aiUsage,
        dashboard: dashboardData,
        agentPerformance: agentPerformance.filter(Boolean),
        generatedAt: now.toISOString(),
      },
    })

    logResponse(response, { userId, projectId, timeRange })
    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Analytics error:', error)
    const response = NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )

    logResponse(response, { error: error instanceof Error ? error.message : 'Unknown error' })
    return addSecurityHeaders(response)
  }
})