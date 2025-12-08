import { useState, useEffect, useCallback } from 'react'

// Persistent storage utilities
export const storage = {
  get: (key: string): any => {
    if (typeof window === 'undefined') return null
    
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  
  set: (key: string, value: any): void => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove from localStorage:', error)
    }
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
    }
  }
}

// Persistent state hook
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options: {
    serialize?: (value: T) => string
    deserialize?: (value: string) => T
  } = {}
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    const stored = storage.get(key)
    return stored !== null ? stored : initialValue
  })

  const setPersistentState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = value instanceof Function ? value(prev) : value
      
      if (options.serialize) {
        storage.set(key, options.serialize(newValue))
      } else {
        storage.set(key, newValue)
      }
      
      return newValue
    })
  }, [key, options.serialize])

  return [state, setPersistentState]
}

// AI message persistence
export function useAIMessages() {
  const [messages, setMessages] = usePersistentState('ai_messages', [])
  const [conversations, setConversations] = usePersistentState('ai_conversations', [])
  const [currentConversation, setCurrentConversation] = usePersistentState('current_conversation', null)

  const addMessage = useCallback((message: any) => {
    const newMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, newMessage])
    
    // Update conversation if there's an active one
    if (currentConversation) {
      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversation.id 
            ? { ...conv, messages: [...conv.messages, newMessage], updatedAt: new Date().toISOString() }
            : conv
        )
      )
    }
  }, [currentConversation, setMessages, setConversations])

  const startNewConversation = useCallback((title?: string) => {
    const newConv = {
      id: Date.now().toString(),
      title: title || 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setConversations(prev => [newConv, ...prev])
    setCurrentConversation(newConv)
    setMessages([])
    
    return newConv
  }, [setConversations, setCurrentConversation, setMessages])

  const loadConversation = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId)
    if (conversation) {
      setCurrentConversation(conversation)
      setMessages(conversation.messages)
    }
  }, [conversations, setCurrentConversation, setMessages])

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId))
    
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null)
      setMessages([])
    }
  }, [currentConversation, setCurrentConversation, setMessages])

  return {
    messages,
    conversations,
    currentConversation,
    addMessage,
    startNewConversation,
    loadConversation,
    deleteConversation,
    setMessages
  }
}

// Loading states with optimistic UI
export function useLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }))
  }, [])

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false
  }, [loadingStates])

  const withLoading = useCallback(async <T>(
    key: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    setLoading(key, true)
    try {
      return await asyncFn()
    } finally {
      setLoading(key, false)
    }
  }, [setLoading])

  return {
    loadingStates,
    setLoading,
    isLoading,
    withLoading
  }
}

// Error handling with retry
export function useErrorHandling() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const setError = useCallback((key: string, error: string) => {
    setErrors(prev => ({ ...prev, [key]: error }))
  }, [])

  const clearError = useCallback((key: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[key]
      return newErrors
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  const withErrorHandling = useCallback(async <T>(
    key: string,
    asyncFn: () => Promise<T>,
    options: {
      retryCount?: number
      retryDelay?: number
      onError?: (error: Error) => void
    } = {}
  ): Promise<T> => {
    const { retryCount = 3, retryDelay = 1000, onError } = options

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        clearError(key)
        return await asyncFn()
      } catch (error) {
        console.error(`Attempt ${attempt} failed for ${key}:`, error)
        
        if (attempt === retryCount) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          setError(key, errorMessage)
          onError?.(error instanceof Error ? error : new Error(errorMessage))
          throw error
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
      }
    }

    throw new Error('Max retries exceeded')
  }, [setError, clearError])

  return {
    errors,
    setError,
    clearError,
    clearAllErrors,
    withErrorHandling
  }
}

// Performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0
  })

  const measureRender = useCallback(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      setMetrics(prev => ({
        renderCount: prev.renderCount + 1,
        lastRenderTime: renderTime,
        averageRenderTime: (prev.averageRenderTime * prev.renderCount + renderTime) / (prev.renderCount + 1)
      }))
    }
  }, [])

  return {
    metrics,
    measureRender
  }
}

// Web Worker for heavy computations
export function useWebWorker<T, R>(
  workerScript: string,
  options: {
    timeout?: number
    onError?: (error: Error) => void
  } = {}
) {
  const [result, setResult] = useState<R | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const execute = useCallback((data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      setIsLoading(true)
      setError(null)

      // Create worker
      const worker = new Worker(workerScript)
      workerRef.current = worker

      // Set up timeout
      let timeoutId: NodeJS.Timeout
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          worker.terminate()
          setError('Operation timed out')
          setIsLoading(false)
          reject(new Error('Operation timed out'))
        }, options.timeout)
      }

      worker.onmessage = (event) => {
        clearTimeout(timeoutId)
        setResult(event.data)
        setIsLoading(false)
        resolve(event.data)
        worker.terminate()
      }

      worker.onerror = (error) => {
        clearTimeout(timeoutId)
        const errorMessage = `Worker error: ${error.message}`
        setError(errorMessage)
        setIsLoading(false)
        options.onError?.(error)
        reject(new Error(errorMessage))
        worker.terminate()
      }

      worker.postMessage(data)
    })
  }, [workerScript, options.timeout, options.onError])

  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    result,
    isLoading,
    error,
    execute,
    cleanup
  }
}

// Concurrency prevention
export function useConcurrency() {
  const [operations, setOperations] = useState<Set<string>>(new Set())

  const startOperation = useCallback((key: string): boolean => {
    setOperations(prev => {
      if (prev.has(key)) {
        return prev
      }
      return new Set(prev).add(key)
    })
    return !operations.has(key)
  }, [operations])

  const endOperation = useCallback((key: string) => {
    setOperations(prev => {
      const newOps = new Set(prev)
      newOps.delete(key)
      return newOps
    })
  }, [])

  const isOperationRunning = useCallback((key: string) => {
    return operations.has(key)
  }, [operations])

  const withConcurrency = useCallback(async <T>(
    key: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    if (!startOperation(key)) {
      throw new Error(`Operation ${key} is already running`)
    }

    try {
      return await asyncFn()
    } finally {
      endOperation(key)
    }
  }, [startOperation, endOperation])

  return {
    operations,
    startOperation,
    endOperation,
    isOperationRunning,
    withConcurrency
  }
}

// Infinite scroll hook
export function useInfiniteScroll(
  fetchFn: (page: number) => Promise<any[]>,
  options: {
    threshold?: number
    initialPage?: number
  } = {}
) {
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(options.initialPage || 1)
  const [error, setError] = useState<string | null>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const newItems = await fetchFn(page)
      
      if (newItems.length === 0) {
        setHasMore(false)
      } else {
        setItems(prev => [...prev, ...newItems])
        setPage(prev => prev + 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more items')
    } finally {
      setIsLoading(false)
    }
  }, [fetchFn, page, isLoading, hasMore])

  const reset = useCallback(() => {
    setItems([])
    setPage(options.initialPage || 1)
    setHasMore(true)
    setError(null)
    setIsLoading(false)
  }, [options.initialPage])

  return {
    items,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset
  }
}

// Import useRef
import { useRef } from 'react'