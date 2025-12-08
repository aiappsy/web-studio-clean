'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db, dbHelpers } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { generateId } from '@/utils/ai'
import { safe } from '@/lib/errors'

export async function createProject(prevState: any, formData: FormData) {
  try {
    const userId = formData.get('userId') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const industry = formData.get('industry') as string
    const targetAudience = formData.get('targetAudience') as string
    const style = formData.get('style') as string

    if (!userId || !name) {
      return { error: 'User ID and project name are required' }
    }

    // Create project in database
    const projectId = generateId()
    
    await db.insert(schema.projects).values({
      id: projectId,
      name,
      description,
      userId,
      status: 'draft',
      projectData: {},
      generationHistory: [],
      aiModelsUsed: [],
      visibility: 'private',
      deploymentCount: 0,
    })

    // Revalidate relevant paths
    revalidatePath('/dashboard')
    revalidatePath('/projects')

    return { success: true, projectId }
  } catch (error) {
    console.error('Failed to create project:', error)
    return { error: 'Failed to create project' }
  }
}

export async function updateProject(prevState: any, formData: FormData) {
  try {
    const projectId = formData.get('projectId') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const theme = formData.get('theme') as string
    const settings = formData.get('settings') as string
    const status = formData.get('status') as string
    const visibility = formData.get('visibility') as string

    if (!projectId) {
      return { error: 'Project ID is required' }
    }

    // Parse JSON strings if provided
    let themeObj = theme ? JSON.parse(theme) : undefined
    let settingsObj = settings ? JSON.parse(settings) : undefined

    // Update project in database
    await db
      .update(schema.projects)
      .set({
        name: name || undefined,
        description: description || undefined,
        theme: themeObj,
        settings: settingsObj,
        status: status || undefined,
        visibility: visibility || undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, projectId))

    // Revalidate relevant paths
    revalidatePath('/dashboard')
    revalidatePath('/projects')
    revalidatePath(`/project/${projectId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to update project:', error)
    return { error: 'Failed to update project' }
  }
}

export async function deleteProject(prevState: any, formData: FormData) {
  try {
    const projectId = formData.get('projectId') as string
    const userId = formData.get('userId') as string

    if (!projectId || !userId) {
      return { error: 'Project ID and user ID are required' }
    }

    // Check if user owns the project
    const project = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .limit(1)

    if (!project || project.userId !== userId) {
      return { error: 'Project not found or access denied' }
    }

    // Soft delete project (or hard delete based on requirements)
    await dbHelpers.softDelete(schema.projects, projectId, userId)

    // Revalidate relevant paths
    revalidatePath('/dashboard')
    revalidatePath('/projects')

    return { success: true }
  } catch (error) {
    console.error('Failed to delete project:', error)
    return { error: 'Failed to delete project' }
  }
}

export async function duplicateProject(prevState: any, formData: FormData) {
  try {
    const projectId = formData.get('projectId') as string
    const userId = formData.get('userId') as string
    const newName = formData.get('name') as string

    if (!projectId || !userId) {
      return { error: 'Project ID and user ID are required' }
    }

    // Get original project
    const originalProject = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .limit(1)

    if (!originalProject || originalProject.userId !== userId) {
      return { error: 'Project not found or access denied' }
    }

    // Create duplicate
    const newProjectId = generateId()
    
    await db.transaction(async (tx) => {
      // Insert new project
      await tx.insert(schema.projects).values({
        id: newProjectId,
        name: newName || `${originalProject.name} (Copy)`,
        description: originalProject.description,
        userId,
        status: 'draft',
        projectData: originalProject.projectData,
        generationHistory: originalProject.generationHistory,
        aiModelsUsed: originalProject.aiModelsUsed,
        visibility: originalProject.visibility,
        deploymentCount: 0,
      })

      // Copy pages
      const originalPages = await tx
        .select()
        .from(schema.pages)
        .where(eq(schema.pages.projectId, projectId))

      for (const page of originalPages) {
        const newPageId = generateId()
        await tx.insert(schema.pages).values({
          id: newPageId,
          projectId: newProjectId,
          title: page.title,
          slug: page.slug,
          content: page.content,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          seoKeywords: page.seoKeywords,
          structuredData: page.structuredData,
          isPublished: false, // Start with unpublished pages
          order: page.order,
          template: page.template,
        })
      }
    })

    // Revalidate relevant paths
    revalidatePath('/dashboard')
    revalidatePath('/projects')

    return { success: true, projectId: newProjectId }
  } catch (error) {
    console.error('Failed to duplicate project:', error)
    return { error: 'Failed to duplicate project' }
  }
}

export async function getProject(projectId: string, userId?: string) {
  try {
    if (!projectId) {
      return { error: 'Project ID is required' }
    }

    let query = db
      .select({
        id: true,
        name: true,
        description: true,
        status: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        deploymentCount: true,
        // Include user info if provided
        ...(userId && { user: { id: true, name: true, email: true } })
      })
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .limit(1)

    if (userId) {
      query = query.innerJoin(
        (projects) => eq(projects.userId, userId),
        (user) => eq(user.id, projects.userId)
      )
    }

    const project = await query

    if (!project) {
      return { error: 'Project not found' }
    }

    return { success: true, project }
  } catch (error) {
    console.error('Failed to get project:', error)
    return { error: 'Failed to get project' }
  }
}

export async function getProjects(userId: string, options?: {
  page?: number
  limit?: number
  status?: string
  visibility?: string
}) {
  try {
    if (!userId) {
      return { error: 'User ID is required' }
    }

    let query = db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.userId, userId))
      .orderBy(desc(schema.projects.createdAt))

    // Apply filters
    if (options?.status) {
      query = query.where(eq(schema.projects.status, options.status))
    }

    if (options?.visibility) {
      query = query.where(eq(schema.projects.visibility, options.visibility))
    }

    // Apply pagination
    const page = options?.page || 1
    const limit = options?.limit || 20
    const offset = (page - 1) * limit

    query = query.limit(limit).offset(offset)

    const projects = await query

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(schema.projects)
      .where(eq(schema.projects.userId, userId))

    return {
      success: true,
      projects,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Failed to get projects:', error)
    return { error: 'Failed to get projects' }
  }
}

export async function generateWebsiteContent(prevState: any, formData: FormData) {
  try {
    const projectId = formData.get('projectId') as string
    const description = formData.get('description') as string
    const style = formData.get('style') as string
    const industry = formData.get('industry') as string
    const targetAudience = formData.get('targetAudience') as string
    const model = formData.get('model') as string

    if (!projectId || !description) {
      return { error: 'Project ID and description are required' }
    }

    // Get project to update
    const project = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .limit(1)

    if (!project) {
      return { error: 'Project not found' }
    }

    // Update project status to generating
    await db
      .update(schema.projects)
      .set({
        status: 'generating',
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, projectId))

    // In a real implementation, this would trigger the AI generation pipeline
    // For now, we'll simulate it with basic content
    const websiteData = {
      sitemap: [
        {
          id: 'home',
          title: 'Home',
          slug: '/',
          description: 'Homepage',
        },
        {
          id: 'about',
          title: 'About',
          slug: '/about',
          description: 'About page',
        },
        {
          id: 'contact',
          title: 'Contact',
          slug: '/contact',
          description: 'Contact page',
        },
      ],
      pages: {
        home: {
          hero: {
            title: `Welcome to ${project.name}`,
            subtitle: style ? `A ${style} website` : 'A modern website',
            description: description,
          },
          sections: [
            {
              type: 'features',
              title: 'Our Services',
              items: ['Service 1', 'Service 2', 'Service 3'],
            }
          ]
        },
        about: {
          hero: {
            title: 'About Us',
            subtitle: 'Our story',
            description: `Learn more about our ${industry} business.`,
          },
        },
        contact: {
          hero: {
            title: 'Contact Us',
            subtitle: 'Get in touch',
            description: 'Reach out to us for more information.',
          },
        },
      },
      layout: {
        colors: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
          accent: '#10b981',
        }
      },
      metadata: {
        projectName: project.name,
        description,
        style,
        industry,
        targetAudience,
        generatedAt: new Date().toISOString(),
        model,
      },
    }

    // Save generation history
    await dbHelpers.saveGeneration(
      project.userId,
      projectId,
      description,
      websiteData,
      'completed',
      1000, // Estimated tokens
      50, // Estimated cost in cents
      5000, // 5 seconds
    )

    // Update project with generated content
    await db
      .update(schema.projects)
      .set({
        projectData: websiteData,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, projectId))

    // Create pages
    for (const page of websiteData.sitemap) {
      await db.insert(schema.pages).values({
        id: generateId(),
        projectId,
        title: page.title,
        slug: page.slug,
        content: websiteData.pages[page.id],
        isPublished: true,
        order: 0,
      })
    }

    // Revalidate paths
    revalidatePath('/dashboard')
    revalidatePath('/projects')
    revalidatePath(`/project/${projectId}`)

    return { success: true, websiteData }
  } catch (error) {
    console.error('Failed to generate website content:', error)
    return { error: 'Failed to generate website content' }
  }
}