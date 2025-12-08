'use client'

import { useState, useCallback } from 'react'

export interface ProjectState {
  projects: any[]
  currentProject: any
  isLoading: boolean
  error: string | null
}

export function useProjects() {
  const [state, setState] = useState<ProjectState>({
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null,
  })

  const loadProjects = useCallback(async (userId?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: userId ? { 'X-User-ID': userId } : {},
      })

      if (!response.ok) {
        throw new Error(`Failed to load projects: ${response.statusText}`)
      }

      const result = await response.json()
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        projects: result.projects || [],
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [])

  const createProject = useCallback(async (projectData: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      })

      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          projects: [result.project, ...prev.projects],
          currentProject: result.project,
        }))
      }

      setState(prev => ({ ...prev, isLoading: false }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [])

  const updateProject = useCallback(async (projectId: string, updates: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`Failed to update project: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          projects: prev.projects.map(p => 
            p.id === projectId ? { ...p, ...updates } : p
          ),
          currentProject: prev.currentProject?.id === projectId 
            ? { ...prev.currentProject, ...updates }
            : prev.currentProject
        }))
      }

      setState(prev => ({ ...prev, isLoading: false }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [])

  const deleteProject = useCallback(async (projectId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          projects: prev.projects.filter(p => p.id !== projectId),
          currentProject: prev.currentProject?.id === projectId ? null : prev.currentProject,
        }))
      }

      setState(prev => ({ ...prev, isLoading: false }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [])

  const setCurrentProject = useCallback((project: any) => {
    setState(prev => ({ ...prev, currentProject: project }))
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, isLoading: false }))
  }, [])

  return {
    ...state,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    clearError,
  }
}

export function useDeployment() {
  const [state, setState] = useState({
    deployments: [],
    currentDeployment: null,
    isLoading: false,
    error: null,
  })

  const loadDeployments = useCallback(async (projectId?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(`/api/deployments`, {
        method: 'GET',
        headers: projectId ? { 'X-Project-ID': projectId } : {},
      })

      if (!response.ok) {
        throw new Error(`Failed to load deployments: ${response.statusText}`)
      }

      const result = await response.json()
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        deployments: result.deployments || [],
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [])

  const createDeployment = useCallback(async (deploymentData: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/deployments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentData),
      })

      if (!response.ok) {
        throw new Error(`Failed to create deployment: ${response.statusText}`)
      }

      const result = await response.json()
      
      setState(prev => ({
        ...prev,
        deployments: [result.deployment, ...prev.deployments],
        currentDeployment: result.deployment,
      }))

      setState(prev => ({ ...prev, isLoading: false }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [])

  return {
    ...state,
    loadDeployments,
    createDeployment,
  }
}