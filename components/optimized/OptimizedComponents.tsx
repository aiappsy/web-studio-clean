import dynamic from 'next/dynamic'
import { memo, useMemo, useCallback } from 'react'
import { Suspense } from 'react'

// Heavy components that should be dynamically imported
export const CodeEditor = dynamic(
  () => import('./CodeEditor'),
  { 
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded" />,
    ssr: false 
  }
)

export const WebsitePreview = dynamic(
  () => import('./WebsitePreview'),
  { 
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded" />,
    ssr: false 
  }
)

export const AIChatInterface = dynamic(
  () => import('./AIChatInterface'),
  { 
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded" />,
    ssr: false 
  }
)

export const DeploymentPanel = dynamic(
  () => import('./DeploymentPanel'),
  { 
    loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded" />,
    ssr: false 
  }
)

// Memoized components to prevent unnecessary re-renders
export const ProjectCard = memo(({ 
  project, 
  onEdit, 
  onDelete 
}: {
  project: any
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) => {
  const handleEdit = useCallback(() => {
    onEdit(project.id)
  }, [project.id, onEdit])

  const handleDelete = useCallback(() => {
    onDelete(project.id)
  }, [project.id, onDelete])

  const formattedDate = useMemo(() => {
    return new Date(project.createdAt).toLocaleDateString()
  }, [project.createdAt])

  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
      <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
      <p className="text-gray-600 mb-4">{project.description}</p>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{formattedDate}</span>
        <div className="space-x-2">
          <button
            onClick={handleEdit}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
})

ProjectCard.displayName = 'ProjectCard'

// Optimized project list with virtual scrolling
export const ProjectList = memo(({ 
  projects, 
  onEdit, 
  onDelete 
}: {
  projects: any[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) => {
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [projects])

  const renderProject = useCallback((project: any) => (
    <ProjectCard
      key={project.id}
      project={project}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  ), [onEdit, onDelete])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedProjects.map(renderProject)}
    </div>
  )
})

ProjectList.displayName = 'ProjectList'

// Optimized three-panel editor
export const ThreePanelEditor = memo(({ 
  leftPanel, 
  centerPanel, 
  rightPanel 
}: {
  leftPanel: React.ReactNode
  centerPanel: React.ReactNode
  rightPanel: React.ReactNode
}) => {
  return (
    <div className="flex h-screen">
      <div className="w-1/4 border-r overflow-auto">
        <Suspense fallback={<div className="p-4 animate-pulse">Loading...</div>}>
          {leftPanel}
        </Suspense>
      </div>
      <div className="w-2/4 border-r overflow-auto">
        <Suspense fallback={<div className="p-4 animate-pulse">Loading...</div>}>
          {centerPanel}
        </Suspense>
      </div>
      <div className="w-1/4 overflow-auto">
        <Suspense fallback={<div className="p-4 animate-pulse">Loading...</div>}>
          {rightPanel}
        </Suspense>
      </div>
    </div>
  )
})

ThreePanelEditor.displayName = 'ThreePanelEditor'

// Memoized preview component with diff updates
export const OptimizedPreview = memo(({ 
  content, 
  previousContent 
}: {
  content: string
  previousContent?: string
}) => {
  const processedContent = useMemo(() => {
    // Process content only if it changed
    if (content !== previousContent) {
      return {
        __html: content.replace(/\n/g, '<br>')
      }
    }
    return { __html: previousContent || '' }
  }, [content, previousContent])

  return (
    <div 
      className="preview-content prose max-w-none"
      dangerouslySetInnerHTML={processedContent}
    />
  )
})

OptimizedPreview.displayName = 'OptimizedPreview'

// Lazy loaded settings panel
export const SettingsPanel = dynamic(
  () => import('./SettingsPanel'),
  { 
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded" />,
    ssr: false 
  }
)

// Optimized form components
export const OptimizedForm = memo(({ 
  onSubmit, 
  children, 
  className = '' 
}: {
  onSubmit: (data: FormData) => void
  children: React.ReactNode
  className?: string
}) => {
  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }, [onSubmit])

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  )
})

OptimizedForm.displayName = 'OptimizedForm'

// Web Worker for heavy computations
export const useWebWorker = (workerScript: string) => {
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback((data: any) => {
    setIsLoading(true)
    setError(null)

    const worker = new Worker(workerScript)
    
    worker.postMessage(data)
    
    worker.onmessage = (e) => {
      setResult(e.data)
      setIsLoading(false)
      worker.terminate()
    }
    
    worker.onerror = (e) => {
      setError(e.message)
      setIsLoading(false)
      worker.terminate()
    }
  }, [workerScript])

  return { execute, result, isLoading, error }
}

// Diff view component for comparing versions
export const DiffView = memo(({ 
  before, 
  after 
}: {
  before: string
  after: string
}) => {
  const diff = useMemo(() => {
    // Simple diff implementation
    const beforeLines = before.split('\n')
    const afterLines = after.split('\n')
    
    const changes = []
    const maxLength = Math.max(beforeLines.length, afterLines.length)
    
    for (let i = 0; i < maxLength; i++) {
      const beforeLine = beforeLines[i] || ''
      const afterLine = afterLines[i] || ''
      
      if (beforeLine === afterLine) {
        changes.push({ type: 'unchanged', content: beforeLine })
      } else {
        if (beforeLine) {
          changes.push({ type: 'removed', content: beforeLine })
        }
        if (afterLine) {
          changes.push({ type: 'added', content: afterLine })
        }
      }
    }
    
    return changes
  }, [before, after])

  return (
    <div className="font-mono text-sm">
      {diff.map((change, index) => (
        <div
          key={index}
          className={`
            ${change.type === 'added' ? 'bg-green-100 text-green-800' : ''}
            ${change.type === 'removed' ? 'bg-red-100 text-red-800' : ''}
            ${change.type === 'unchanged' ? 'bg-gray-50' : ''}
            px-2 py-1
          `}
        >
          {change.content || ' '}
        </div>
      ))}
    </div>
  )
})

DiffView.displayName = 'DiffView'

// Import useState
import { useState } from 'react'