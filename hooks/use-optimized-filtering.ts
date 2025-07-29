import { useState, useEffect, useCallback, useRef } from 'react'
import type { QuestionFilters } from '@/lib/types'

interface FilterOptions {
  specialties: string[]
  examTypes: string[]
  years: number[]
  difficulties: number[]
}

interface FilterResult {
  count: number
  questions?: any[]
  performance?: {
    responseTime: string
    cached: boolean
    method: string
  }
}

interface UseOptimizedFilteringProps {
  userId?: string
  initialFilters?: Partial<QuestionFilters>
  debounceMs?: number
  enableProgressiveLoading?: boolean
}

export function useOptimizedFiltering({
  userId,
  initialFilters = {},
  debounceMs = 300,
  enableProgressiveLoading = true
}: UseOptimizedFilteringProps = {}) {
  // State management
  const [filters, setFilters] = useState<QuestionFilters>({
    specialties: [],
    years: [],
    difficulties: [],
    examTypes: [],
    questionStatus: [],
    ...initialFilters
  })
  
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    specialties: [],
    examTypes: [],
    years: [],
    difficulties: [1, 2, 3, 4, 5]
  })
  
  const [questionCount, setQuestionCount] = useState(0)
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([])
  const [isLoadingCount, setIsLoadingCount] = useState(false)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  
  // Caching
  const countCache = useRef(new Map<string, FilterResult>())
  const questionsCache = useRef(new Map<string, any[]>())
  const optionsCache = useRef<FilterOptions | null>(null)
  
  // Debouncing
  const debounceTimer = useRef<NodeJS.Timeout>()
  const abortController = useRef<AbortController>()
  
  // Generate cache key for filters
  const getCacheKey = useCallback((filters: QuestionFilters, userId?: string) => {
    const filterKey = JSON.stringify({
      specialties: [...filters.specialties].sort(),
      years: [...filters.years].sort(),
      difficulties: [...filters.difficulties].sort(),
      examTypes: [...filters.examTypes].sort(),
      questionStatus: [...filters.questionStatus].sort(),
      userId: userId || 'anonymous'
    })
    return filterKey
  }, [])
  
  // Optimized filter options loading with caching
  const loadFilterOptions = useCallback(async () => {
    if (optionsCache.current) {
      setFilterOptions(optionsCache.current)
      return
    }
    
    setIsLoadingOptions(true)
    try {
      const response = await fetch('/api/questions/filter-options')
      const data = await response.json()
      
      if (data && response.ok) {
        const options: FilterOptions = {
          specialties: data.specialties || [],
          examTypes: data.examTypes || [],
          years: data.years || [],
          difficulties: [1, 2, 3, 4, 5]
        }
        
        optionsCache.current = options
        setFilterOptions(options)
        
        console.log(`Filter options loaded: ${options.specialties.length} specialties, ${options.years.length} years (${data.method})`)
      }
    } catch (error) {
      console.error('Error loading filter options:', error)
    } finally {
      setIsLoadingOptions(false)
    }
  }, [])
  
  // Fast count-only API call
  const fetchQuestionCount = useCallback(async (filters: QuestionFilters, signal?: AbortSignal) => {
    const cacheKey = getCacheKey(filters, userId)
    
    // Check cache first
    const cached = countCache.current.get(cacheKey)
    if (cached) {
      setQuestionCount(cached.count)
      return cached
    }
    
    try {
      const response = await fetch('/api/questions/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, userId }),
        signal
      })
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data = await response.json()
      const result: FilterResult = {
        count: data.count || 0,
        performance: data.performance
      }
      
      // Cache the result
      countCache.current.set(cacheKey, result)
      setQuestionCount(result.count)
      
      return result
    } catch (error: any) {
      if (error.name === 'AbortError') return null
      console.error('Error fetching question count:', error)
      return { count: 0 }
    }
  }, [getCacheKey, userId])
  
  // Full questions loading (only when needed)
  const fetchQuestions = useCallback(async (filters: QuestionFilters, limit = 5000) => {
    const cacheKey = `${getCacheKey(filters, userId)}_${limit}`
    
    // Check cache first
    const cached = questionsCache.current.get(cacheKey)
    if (cached) {
      setAvailableQuestions(cached)
      return cached
    }
    
    setIsLoadingQuestions(true)
    try {
      const response = await fetch('/api/questions/filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filters, 
          userId,
          limit,
          offset: 0 
        })
      })
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data = await response.json()
      const questions = data.questions || []
      
      // Cache the result
      questionsCache.current.set(cacheKey, questions)
      setAvailableQuestions(questions)
      setQuestionCount(data.count || 0)
      
      return questions
    } catch (error) {
      console.error('Error fetching questions:', error)
      setAvailableQuestions([])
      return []
    } finally {
      setIsLoadingQuestions(false)
    }
  }, [getCacheKey, userId])
  
  // Debounced count fetching
  const debouncedFetchCount = useCallback((filters: QuestionFilters) => {
    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort()
    }
    
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // Set loading state immediately for better UX
    setIsLoadingCount(true)
    
    // Debounce the actual request
    debounceTimer.current = setTimeout(async () => {
      abortController.current = new AbortController()
      
      try {
        await fetchQuestionCount(filters, abortController.current.signal)
      } finally {
        setIsLoadingCount(false)
      }
    }, debounceMs)
  }, [fetchQuestionCount, debounceMs])
  
  // Filter change handlers
  const updateFilter = useCallback((filterType: keyof QuestionFilters, value: string | number, checked: boolean) => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [filterType]: checked 
          ? [...(prev[filterType] as (string | number)[]), value]
          : (prev[filterType] as (string | number)[]).filter(item => item !== value)
      }
      
      // Trigger debounced count fetch
      debouncedFetchCount(newFilters)
      
      return newFilters
    })
  }, [debouncedFetchCount])
  
  const clearAllFilters = useCallback(() => {
    const newFilters: QuestionFilters = {
      specialties: [],
      years: [],
      difficulties: [],
      examTypes: [],
      questionStatus: []
    }
    setFilters(newFilters)
    debouncedFetchCount(newFilters)
  }, [debouncedFetchCount])
  
  const clearFilterSection = useCallback((filterType: keyof QuestionFilters) => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [filterType]: []
      }
      debouncedFetchCount(newFilters)
      return newFilters
    })
  }, [debouncedFetchCount])
  
  const selectAllInSection = useCallback((filterType: keyof QuestionFilters) => {
    let allValues: (string | number)[] = []
    
    switch (filterType) {
      case 'specialties':
        allValues = filterOptions.specialties
        break
      case 'examTypes':
        allValues = filterOptions.examTypes
        break
      case 'years':
        allValues = filterOptions.years
        break
      case 'difficulties':
        allValues = filterOptions.difficulties
        break
      case 'questionStatus':
        allValues = ['answered', 'unanswered', 'correct', 'incorrect', 'flagged']
        break
    }
    
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [filterType]: allValues
      }
      debouncedFetchCount(newFilters)
      return newFilters
    })
  }, [filterOptions, debouncedFetchCount])
  
  // Initialize
  useEffect(() => {
    loadFilterOptions()
  }, [loadFilterOptions])
  
  // Initial count fetch
  useEffect(() => {
    debouncedFetchCount(filters)
  }, []) // Only on mount
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [])
  
  return {
    // State
    filters,
    filterOptions,
    questionCount,
    availableQuestions,
    
    // Loading states
    isLoadingCount,
    isLoadingQuestions,
    isLoadingOptions,
    
    // Actions
    updateFilter,
    clearAllFilters,
    clearFilterSection,
    selectAllInSection,
    fetchQuestions,
    
    // Utilities
    getSelectedFiltersCount: () => Object.values(filters).reduce((total, filterArray) => total + filterArray.length, 0),
    getCacheStats: () => ({
      countCacheSize: countCache.current.size,
      questionsCacheSize: questionsCache.current.size,
      optionsCached: !!optionsCache.current
    })
  }
}