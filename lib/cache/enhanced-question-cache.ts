// Enhanced multi-level caching system for questions and filter data
// Addresses performance issues and cache invalidation problems

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  version: number
  accessCount: number
  lastAccessed: number
}

interface FilterOptions {
  specialties: string[]
  examTypes: string[]
  years: number[]
  difficulties: number[]
}

interface YearStats {
  year: number
  questionCount: number
  specialtyCount: number
  examTypeCount: number
  minDifficulty: number
  maxDifficulty: number
}

interface QuestionFilters {
  specialties?: string[]
  examTypes?: string[]
  years?: number[]
  difficulties?: number[]
  questionStatus?: string[]
}

interface CachedQuestions {
  questions: any[]
  count: number
  totalFromDB: number
}

interface CacheStats {
  size: number
  hitRate: number
  missRate: number
  entries: Array<{
    key: string
    size: number
    age: number
    accessCount: number
    lastAccessed: number
  }>
}

class EnhancedQuestionCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly VERSION = 2 // Increment to invalidate all cache
  
  // TTL configurations (in milliseconds)
  private readonly TTL_CONFIG = {
    YEARS: 60 * 60 * 1000,        // 1 hour (years change rarely)
    YEAR_STATS: 30 * 60 * 1000,   // 30 minutes (stats change moderately)
    FILTER_OPTIONS: 15 * 60 * 1000, // 15 minutes (filter options)
    QUESTIONS: 5 * 60 * 1000,      // 5 minutes (questions change frequently)
    COUNTS: 10 * 60 * 1000,        // 10 minutes (counts)
    DEFAULT: 5 * 60 * 1000         // 5 minutes default
  }
  
  // Cache size limits
  private readonly MAX_CACHE_SIZE = 1000
  private readonly MAX_MEMORY_MB = 100
  
  // Performance tracking
  private hits = 0
  private misses = 0

  private generateKey(prefix: string, params?: any): string {
    if (!params) return `${prefix}:v${this.VERSION}`
    
    // Create a stable, sorted key from parameters
    const sortedParams = this.normalizeParams(params)
    const paramString = JSON.stringify(sortedParams)
    return `${prefix}:v${this.VERSION}:${this.hashString(paramString)}`
  }

  private normalizeParams(params: any): any {
    if (Array.isArray(params)) {
      return [...params].sort()
    }
    
    if (typeof params === 'object' && params !== null) {
      return Object.keys(params)
        .sort()
        .reduce((result, key) => {
          const value = params[key]
          if (Array.isArray(value)) {
            result[key] = [...value].sort()
          } else if (typeof value === 'object' && value !== null) {
            result[key] = this.normalizeParams(value)
          } else {
            result[key] = value
          }
          return result
        }, {} as any)
    }
    
    return params
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2 // Rough estimate in bytes
    } catch {
      return 1000 // Default estimate
    }
  }

  private evictLRU(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return

    // Find least recently used entries
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed)

    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25)
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i].key)
    }
  }

  private set<T>(key: string, data: T, ttl: number = this.TTL_CONFIG.DEFAULT): void {
    // Evict old entries if necessary
    this.evictLRU()

    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      version: this.VERSION,
      accessCount: 0,
      lastAccessed: now
    })
  }

  private get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.misses++
      return null
    }

    if (this.isExpired(entry) || entry.version !== this.VERSION) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.hits++
    
    return entry.data as T
  }

  // Enhanced years caching with validation
  setYears(years: number[]): void {
    if (!Array.isArray(years) || years.length === 0) {
      console.warn('Invalid years data provided to cache')
      return
    }

    // Validate years are reasonable
    const validYears = years.filter(year => 
      typeof year === 'number' && 
      year >= 1900 && 
      year <= new Date().getFullYear() + 5
    )

    if (validYears.length !== years.length) {
      console.warn(`Filtered out ${years.length - validYears.length} invalid years`)
    }

    this.set('years', validYears.sort((a, b) => b - a), this.TTL_CONFIG.YEARS)
  }

  getYears(): number[] | null {
    return this.get<number[]>('years')
  }

  // Year statistics caching
  setYearStats(stats: YearStats[]): void {
    if (!Array.isArray(stats)) return
    this.set('year_stats', stats, this.TTL_CONFIG.YEAR_STATS)
  }

  getYearStats(): YearStats[] | null {
    return this.get<YearStats[]>('year_stats')
  }

  // Enhanced filter options caching
  setFilterOptions(options: FilterOptions): void {
    if (!options || typeof options !== 'object') return
    
    // Validate filter options structure
    const validOptions = {
      specialties: Array.isArray(options.specialties) ? options.specialties : [],
      examTypes: Array.isArray(options.examTypes) ? options.examTypes : [],
      years: Array.isArray(options.years) ? options.years.filter(y => 
        typeof y === 'number' && y >= 1900 && y <= new Date().getFullYear() + 5
      ) : [],
      difficulties: Array.isArray(options.difficulties) ? options.difficulties : []
    }

    this.set('filter_options', validOptions, this.TTL_CONFIG.FILTER_OPTIONS)
    
    // Also cache individual components for faster access
    if (validOptions.years.length > 0) {
      this.setYears(validOptions.years)
    }
  }

  getFilterOptions(): FilterOptions | null {
    return this.get<FilterOptions>('filter_options')
  }

  // Cached filtered questions with intelligent key generation
  setFilteredQuestions(filters: QuestionFilters, userId: string, limit: number, offset: number, data: CachedQuestions): void {
    const key = this.generateKey('filtered_questions', { filters, userId, limit, offset })
    this.set(key, data, this.TTL_CONFIG.QUESTIONS)
  }

  getFilteredQuestions(filters: QuestionFilters, userId: string, limit: number, offset: number): CachedQuestions | null {
    const key = this.generateKey('filtered_questions', { filters, userId, limit, offset })
    return this.get<CachedQuestions>(key)
  }

  // Question counts with separate caching
  setQuestionCount(filters: QuestionFilters, count: number): void {
    const key = this.generateKey('question_count', filters)
    this.set(key, count, this.TTL_CONFIG.COUNTS)
  }

  getQuestionCount(filters: QuestionFilters): number | null {
    const key = this.generateKey('question_count', filters)
    return this.get<number>(key)
  }

  // ID mapping caches with longer TTL
  setSpecialtyIds(names: string[], ids: number[]): void {
    const key = this.generateKey('specialty_ids', names)
    this.set(key, ids, this.TTL_CONFIG.FILTER_OPTIONS)
  }

  getSpecialtyIds(names: string[]): number[] | null {
    const key = this.generateKey('specialty_ids', names)
    return this.get<number[]>(key)
  }

  setExamTypeIds(names: string[], ids: number[]): void {
    const key = this.generateKey('exam_type_ids', names)
    this.set(key, ids, this.TTL_CONFIG.FILTER_OPTIONS)
  }

  getExamTypeIds(names: string[]): number[] | null {
    const key = this.generateKey('exam_type_ids', names)
    return this.get<number[]>(key)
  }

  // Cache invalidation methods
  invalidateYears(): void {
    this.cache.delete(`years:v${this.VERSION}`)
    this.cache.delete(`year_stats:v${this.VERSION}`)
    this.clearFilterOptions()
  }

  invalidateQuestions(): void {
    for (const key of this.cache.keys()) {
      if (key.includes('filtered_questions') || key.includes('question_count')) {
        this.cache.delete(key)
      }
    }
  }

  clearAll(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  clearFilterOptions(): void {
    this.cache.delete(`filter_options:v${this.VERSION}`)
    for (const key of this.cache.keys()) {
      if (key.includes('specialty_ids') || key.includes('exam_type_ids')) {
        this.cache.delete(key)
      }
    }
  }

  // Performance monitoring
  getStats(): CacheStats {
    const total = this.hits + this.misses
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      size: this.estimateSize(entry.data),
      age: Date.now() - entry.timestamp,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed
    }))

    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
      missRate: total > 0 ? this.misses / total : 0,
      entries
    }
  }

  // Cleanup expired entries and optimize memory
  cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry) || entry.version !== this.VERSION) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`)
    }

    // Additional memory optimization
    this.evictLRU()
  }

  // Warmup cache with essential data
  async warmup(): Promise<void> {
    try {
      // Pre-fetch years if not cached
      if (!this.getYears()) {
        const response = await fetch('/api/questions/years')
        if (response.ok) {
          const data = await response.json()
          if (data.years && Array.isArray(data.years)) {
            this.setYears(data.years)
          }
        }
      }

      // Pre-fetch filter options if not cached
      if (!this.getFilterOptions()) {
        const response = await fetch('/api/questions/filter-options')
        if (response.ok) {
          const data = await response.json()
          if (data) {
            this.setFilterOptions(data)
          }
        }
      }
    } catch (error) {
      console.warn('Cache warmup failed:', error)
    }
  }
}

// Global enhanced cache instance
export const enhancedQuestionCache = new EnhancedQuestionCache()

// Periodic cleanup and optimization (server-side only)
if (typeof window === 'undefined') {
  // Cleanup every 5 minutes
  setInterval(() => {
    enhancedQuestionCache.cleanup()
  }, 5 * 60 * 1000)

  // Performance logging every 30 minutes
  setInterval(() => {
    const stats = enhancedQuestionCache.getStats()
    console.log('Cache performance:', {
      size: stats.size,
      hitRate: (stats.hitRate * 100).toFixed(2) + '%',
      missRate: (stats.missRate * 100).toFixed(2) + '%'
    })
  }, 30 * 60 * 1000)
}

// Export both caches for backward compatibility
export { enhancedQuestionCache as questionCache }