import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAI } from '@/hooks/useAI'
import { usePersistentState, useLoadingStates, useErrorHandling, usePerformanceMonitor, useWebWorker, useConcurrency } from '@/hooks/useEnhanced'
import { ErrorBoundary, LoadingStates, ProgressBar, DiffView } from '@/components/optimized/OptimizedComponents'
import dynamic from 'next/dynamic'

// Dynamically import heavy components
const CodeEditor = dynamic(() => import('@/components/CodeEditor'), {
  loading: () => <LoadingStates type="skeleton" />,
  ssr: false
})

const WebsitePreview = dynamic(() => import('@/components/WebsitePreview'), {
  loading: () => <LoadingStates type="skeleton" />,
  ssr: false
})

const AIChatInterface = dynamic(() => import('@/components/AIChatInterface'), {
  loading: () => <LoadingStates type="skeleton" />,
  ssr: false
})

// Main three-panel editor component
export default function ThreePanelEditor({ projectId, initialContent }: {
  projectId: string
  initialContent?: any
}) {
  // State management
  const [activePanel, setActivePanel] = useState('code')
  const [code, setCode] = usePersistentState(`editor_code_${projectId}`, initialContent?.code || '')
  const [previewContent, setPreviewContent] = useState(initialContent?.preview || '')
  const [aiMessages, { addMessage, startNewConversation }] = useAIMessages()
  const [generationProgress, setGenerationProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Enhanced hooks
  const { generateStreaming, cancelRequest, progress } = useAI()
  const { loadingStates, setLoading, withLoading } = useLoadingStates()
  const { errors, setError, clearError, withErrorHandling } = useErrorHandling()
  const { metrics, measureRender } = usePerformanceMonitor()
  const { isOperationRunning, withConcurrency } = useConcurrency()
  
  // Web Worker for heavy computations
  const { result: workerResult, execute: executeWorker, cleanup } = useWebWorker('/workers/editor-worker.js')
  
  // Refs for performance optimization
  const codeEditorRef = useRef<any>(null)
  const previewRef = useRef<any>(null)
  const updateTimeoutRef = useRef<NodeJS.Timeout>()

  // Debounced update function
  const debouncedUpdate = useCallback(
    (newCode: string) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        updatePreview(newCode)
      }, 500) // 500ms debounce
    },
    []
  )

  // Update preview content
  const updatePreview = useCallback(async (newCode: string) => {
    const renderStart = measureRender()
    
    try {
      // Use web worker for HTML processing if available
      if (workerResult) {
        const processed = await executeWorker({
          type: 'process-html',
          code: newCode
        })
        setPreviewContent(processed.html)
      } else {
        // Fallback to synchronous processing
        const processed = processHTML(newCode)
        setPreviewContent(processed)
      }
      
      renderStart()
    } catch (error) {
      setError('preview', error instanceof Error ? error.message : 'Preview update failed')
    }
  }, [executeWorker, workerResult, measureRender, setError])

  // Process HTML (simplified version)
  const processHTML = useCallback((htmlCode: string): string => {
    // Basic HTML processing
    return htmlCode
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }, [])

  // Handle code changes
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
    debouncedUpdate(newCode)
  }, [setCode, debouncedUpdate])

  // Generate content with AI
  const handleGenerate = useCallback(async (prompt: string) => {
    if (isOperationRunning('generate')) {
      return
    }

    await withConcurrency('generate', async () => {
      setIsGenerating(true)
      setGenerationProgress(0)
      clearError('generate')

      try {
        const response = await generateStreaming(
          '/api/ai/generate',
          {
            prompt,
            context: {
              currentCode: code,
              projectId
            }
          },
          (chunk) => {
            setGenerationProgress(prev => Math.min(prev + 10, 90))
          }
        )

        if (response.success && response.data) {
          setCode(response.data.code)
          updatePreview(response.data.code)
          addMessage({
            role: 'assistant',
            content: response.data.explanation || 'Content generated successfully'
          })
        } else {
          throw new Error(response.error || 'Generation failed')
        }
      } catch (error) {
        setError('generate', error instanceof Error ? error.message : 'Generation failed')
      } finally {
        setIsGenerating(false)
        setGenerationProgress(100)
      }
    })
  }, [code, projectId, isOperationRunning, withConcurrency, generateStreaming, updatePreview, addMessage, setError, clearError])

  // Handle panel switching
  const handlePanelSwitch = useCallback((panel: string) => {
    setActivePanel(panel)
    
    // Save current state when switching
    if (panel === 'preview') {
      updatePreview(code)
    }
  }, [code, updatePreview])

  // Optimized render based on active panel
  const renderPanel = useMemo(() => {
    const renderStart = measureRender()
    
    switch (activePanel) {
      case 'code':
        return (
          <div className="h-full">
            <CodeEditor
              ref={codeEditorRef}
              value={code}
              onChange={handleCodeChange}
              language="html"
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                renderLineHighlight: 'gutter'
              }}
            />
            {errors.code && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 m-2 rounded">
                {errors.code}
              </div>
            )}
          </div>
        )
      
      case 'preview':
        return (
          <div className="h-full">
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
              <h3 className="font-semibold">Preview</h3>
              <button
                onClick={() => updatePreview(code)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
            <div
              ref={previewRef}
              className="h-full overflow-auto"
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
            {errors.preview && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 m-2 rounded">
                {errors.preview}
              </div>
            )}
          </div>
        )
      
      case 'ai':
        return (
          <div className="h-full flex flex-col">
            <div className="bg-white border-b border-gray-200 px-4 py-2">
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <div className="flex-1 overflow-auto">
              <AIChatInterface
                messages={aiMessages}
                onSendMessage={handleGenerate}
                isLoading={isGenerating}
                progress={generationProgress}
              />
            </div>
          </div>
        )
      
      default:
        return null
    }
  }, [activePanel, code, previewContent, errors, handleCodeChange, updatePreview, aiMessages, isGenerating, generationProgress, handleGenerate, measureRender])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      cleanup()
    }
  }, [cleanup])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault()
            handlePanelSwitch('code')
            break
          case '2':
            event.preventDefault()
            handlePanelSwitch('preview')
            break
          case '3':
            event.preventDefault()
            handlePanelSwitch('ai')
            break
          case 's':
            event.preventDefault()
            handleGenerate('Improve this code')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePanelSwitch, handleGenerate])

  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Editor Error</h2>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    >
      <div className="flex h-screen bg-gray-50">
        {/* Left Panel - Code Editor */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
            <h3 className="font-semibold">Code Editor</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePanelSwitch('code')}
                className={`px-2 py-1 rounded text-sm ${
                  activePanel === 'code' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Code
              </button>
              <button
                onClick={() => handlePanelSwitch('preview')}
                className={`px-2 py-1 rounded text-sm ${
                  activePanel === 'preview' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => handlePanelSwitch('ai')}
                className={`px-2 py-1 rounded text-sm ${
                  activePanel === 'ai' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                AI
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {renderPanel}
          </div>
        </div>

        {/* Center Panel - Main Content */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <h3 className="font-semibold">Main Content</h3>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {isGenerating && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Generating content...</span>
                  <span className="text-sm text-gray-600">{generationProgress}%</span>
                </div>
                <ProgressBar progress={generationProgress} />
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => handleGenerate('Create a landing page')}
                    disabled={isOperationRunning('generate')}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Generate Landing Page
                  </button>
                  <button
                    onClick={() => handleGenerate('Add a contact form')}
                    disabled={isOperationRunning('generate')}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Contact Form
                  </button>
                  <button
                    onClick={() => handleGenerate('Improve the design')}
                    disabled={isOperationRunning('generate')}
                    className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    Improve Design
                  </button>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Project Info</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Project ID: {projectId}</p>
                  <p>Characters: {code.length}</p>
                  <p>Lines: {code.split('\n').length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - AI Assistant */}
        <div className="w-1/3 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
            <h3 className="font-semibold">AI Assistant</h3>
            {isGenerating && (
              <button
                onClick={() => cancelRequest()}
                className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            {renderPanel}
          </div>
        </div>
      </div>

      {/* Performance Metrics (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
          <div>Render Count: {metrics.renderCount}</div>
          <div>Last Render: {metrics.lastRenderTime}ms</div>
          <div>Avg Render: {metrics.averageRenderTime}ms</div>
        </div>
      )}
    </ErrorBoundary>
  )
}