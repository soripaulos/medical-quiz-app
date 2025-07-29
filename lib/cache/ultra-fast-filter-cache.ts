import type { QuestionFilters } from '@/lib/types'

interface CacheEntry<T> {
  data: T
  timestamp: number
  hits: number
  lastAccessed: number
}

interface FilterCacheStats {
  totalEntries: number
  totalHits: number
  totalMisses: number
  hitRate: number
  cacheSize: number
  oldestEntry: number
  newestEntry: number
}

interface FilterOptions {
  specialties: string[]
  examTypes: string[]
  years: number[]
  difficulties: number[]
}

interface QuestionCountResult {
  count: number
  performance?: {
    cached: boolean
    responseTime: string
    method: string
  }
}

class UltraFastFilterCache {
  private countCache = new Map<string, CacheEntry<QuestionCountResult>>()
  private questionsCache = new Map<string, CacheEntry<any[]>>()
  private specialtyIdCache = new Map<string, CacheEntry<number[]>>()
  private examTypeIdCache = new Map<string, CacheEntry<number[]>>()
  private filterOptionsCache: CacheEntry<FilterOptions> | null = null
  
  // Cache configuration
  private readonly MAX_CACHE_SIZE = 1000
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly COUNT_CACHE_TTL = 2 * 60 * 1000 // 2 minutes (counts change more frequently)
  private readonly OPTIONS_CACHE_TTL = 30 * 60 * 1000 // 30 minutes (options rarely change)
  private readonly ID_MAPPING_TTL = 60 * 60 * 1000 // 1 hour (ID mappings rarely change)
  
  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  }

  /**
   * Generate optimized cache key for filters
   */
  private generateCacheKey(filters: QuestionFilters, userId?: string, prefix = ''): string {
    // Sort arrays for consistent cache keys
    const normalizedFilters = {
      specialties: [...(filters.specialties || [])].sort(),
      years: [...(filters.years || [])].sort((a, b) => a - b),
      difficulties: [...(filters.difficulties || [])].sort((a, b) => a - b),
      examTypes: [...(filters.examTypes || [])].sort(),
      questionStatus: [...(filters.questionStatus || [])].sort()
    }
    
    const key = JSON.stringify({
      ...normalizedFilters,
      userId: userId || 'anonymous'
    })
    
    return prefix ? `${prefix}:${key}` : key
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>, ttl: number): boolean {
    return Date.now() - entry.timestamp < ttl
  }

  /**
   * Evict least recently used entries when cache is full
   */
  private evictLRU<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size < this.MAX_CACHE_SIZE) return
    
    let oldestKey = ''
    let oldestTime = Date.now()
    
    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey)
      this.stats.evictions++
    }
  }

  /**
   * Get cached question count
   */
  getQuestionCount(filters: QuestionFilters, userId?: string): QuestionCountResult | null {
    const key = this.generateCacheKey(filters, userId, 'count')
    const entry = this.countCache.get(key)
    
    if (!entry || !this.isValid(entry, this.COUNT_CACHE_TTL)) {
      this.stats.misses++
      return null
    }
    
    // Update access stats
    entry.hits++
    entry.lastAccessed = Date.now()
    this.stats.hits++
    
    return {
      ...entry.data,
      performance: {
        ...entry.data.performance,
        cached: true,
        responseTime: '<10ms'
      }
    }
  }

  /**
   * Cache question count result
   */
  setQuestionCount(filters: QuestionFilters, result: QuestionCountResult, userId?: string): void {
    const key = this.generateCacheKey(filters, userId, 'count')
    this.evictLRU(this.countCache)
    
    this.countCache.set(key, {
      data: result,
      timestamp: Date.now(),
      hits: 0,
      lastAccessed: Date.now()
    })
  }

  /**
   * Get cached questions
   */
  getQuestions(filters: QuestionFilters, userId?: string, limit?: number): any[] | null {
    const key = this.generateCacheKey(filters, userId, `questions:${limit || 'all'}`)
    const entry = this.questionsCache.get(key)
    
    if (!entry || !this.isValid(entry, this.DEFAULT_TTL)) {
      this.stats.misses++
      return null
    }
    
    // Update access stats
    entry.hits++
    entry.lastAccessed = Date.now()
    this.stats.hits++
    
    return entry.data
  }

  /**
   * Cache questions result
   */
  setQuestions(filters: QuestionFilters, questions: any[], userId?: string, limit?: number): void {
    const key = this.generateCacheKey(filters, userId, `questions:${limit || 'all'}`)
    this.evictLRU(this.questionsCache)
    
    this.questionsCache.set(key, {
      data: questions,
      timestamp: Date.now(),
      hits: 0,
      lastAccessed: Date.now()
    })
  }

  /**
   * Get cached specialty IDs
   */
  getSpecialtyIds(specialtyNames: string[]): number[] | null {
    const key = JSON.stringify([...specialtyNames].sort())
    const entry = this.specialtyIdCache.get(key)
    
    if (!entry || !this.isValid(entry, this.ID_MAPPING_TTL)) {
      this.stats.misses++
      return null
    }
    
    entry.hits++
    entry.lastAccessed = Date.now()
    this.stats.hits++
    
    return entry.data
  }

  /**
   * Cache specialty IDs
   */
  setSpecialtyIds(specialtyNames: string[], ids: number[]): void {
    const key = JSON.stringify([...specialtyNames].sort())
    this.evictLRU(this.specialtyIdCache)
    
    this.specialtyIdCache.set(key, {
      data: ids,
      timestamp: Date.now(),
      hits: 0,
      lastAccessed: Date.now()
    })
  }

  /**
   * Get cached exam type IDs
   */
  getExamTypeIds(examTypeNames: string[]): number[] | null {
    const key = JSON.stringify([...examTypeNames].sort())
    const entry = this.examTypeIdCache.get(key)
    
    if (!entry || !this.isValid(entry, this.ID_MAPPING_TTL)) {
      this.stats.misses++
      return null
    }
    
    entry.hits++
    entry.lastAccessed = Date.now()
    this.stats.hits++
    
    return entry.data
  }

  /**
   * Cache exam type IDs
   */
  setExamTypeIds(examTypeNames: string[], ids: number[]): void {
    const key = JSON.stringify([...examTypeNames].sort())
    this.evictLRU(this.examTypeIdCache)
    
    this.examTypeIdCache.set(key, {
      data: ids,
      timestamp: Date.now(),
      hits: 0,
      lastAccessed: Date.now()
    })
  }

  /**
   * Get cached filter options
   */
  getFilterOptions(): FilterOptions | null {
    if (!this.filterOptionsCache || !this.isValid(this.filterOptionsCache, this.OPTIONS_CACHE_TTL)) {
      this.stats.misses++
      return null
    }
    
    this.filterOptionsCache.hits++
    this.filterOptionsCache.lastAccessed = Date.now()
    this.stats.hits++
    
    return this.filterOptionsCache.data
  }

  /**
   * Cache filter options
   */
  setFilterOptions(options: FilterOptions): void {
    this.filterOptionsCache = {
      data: options,
      timestamp: Date.now(),
      hits: 0,
      lastAccessed: Date.now()
    }
  }

  /**
   * Preload frequently used filter combinations
   */
  async preloadCommonFilters(): Promise<void> {
    // Common filter combinations to preload
    const commonCombinations = [
      { years: [2024, 2023] },
      { specialties: ['Internal Medicine'] },
      { specialties: ['Cardiology'] },
      { difficulties: [1, 2, 3] },
      { years: [2024], difficulties: [1, 2] },
      { years: [2023, 2024], specialties: ['Internal Medicine'] }
    ]

    for (const filters of commonCombinations) {
      try {
        const response = await fetch('/api/questions/count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters })
        })
        
        if (response.ok) {
          const data = await response.json()
          this.setQuestionCount(filters as QuestionFilters, data)
        }
      } catch (error) {
        console.warn('Failed to preload filter combination:', filters, error)
      }
    }
  }

  /**
   * Intelligent cache warming based on user patterns
   */
  warmCache(recentFilters: QuestionFilters[]): void {
    // Analyze patterns and preload related combinations
    const patterns = this.analyzeFilterPatterns(recentFilters)
    
    patterns.forEach(pattern => {
      // Preload variations of common patterns
      this.preloadFilterVariations(pattern)
    })
  }

  /**
   * Analyze filter usage patterns
   */
  private analyzeFilterPatterns(filters: QuestionFilters[]): QuestionFilters[] {
    const patterns: QuestionFilters[] = []
    
    // Find most common specialties
    const specialtyCount = new Map<string, number>()
    const yearCount = new Map<number, number>()
    
    filters.forEach(filter => {
      filter.specialties?.forEach(specialty => {
        specialtyCount.set(specialty, (specialtyCount.get(specialty) || 0) + 1)
      })
      filter.years?.forEach(year => {
        yearCount.set(year, (yearCount.get(year) || 0) + 1)
      })
    })
    
    // Create patterns from most common combinations
    const topSpecialties = Array.from(specialtyCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([specialty]) => specialty)
    
    const topYears = Array.from(yearCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([year]) => year)
    
    // Generate patterns
    topSpecialties.forEach(specialty => {
      patterns.push({ specialties: [specialty], years: [], difficulties: [], examTypes: [], questionStatus: [] })
      
      topYears.forEach(year => {
        patterns.push({ 
          specialties: [specialty], 
          years: [year], 
          difficulties: [], 
          examTypes: [], 
          questionStatus: [] 
        })
      })
    })
    
    return patterns
  }

  /**
   * Preload variations of a filter pattern
   */
  private async preloadFilterVariations(baseFilter: QuestionFilters): Promise<void> {
    const variations = [
      baseFilter,
      { ...baseFilter, difficulties: [1, 2] },
      { ...baseFilter, difficulties: [3, 4, 5] }
    ]
    
    for (const variation of variations) {
      try {
        const response = await fetch('/api/questions/count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters: variation })
        })
        
        if (response.ok) {
          const data = await response.json()
          this.setQuestionCount(variation, data)
        }
      } catch (error) {
        // Silent fail for preloading
      }
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now()
    
    // Clear expired count cache
    for (const [key, entry] of this.countCache.entries()) {
      if (!this.isValid(entry, this.COUNT_CACHE_TTL)) {
        this.countCache.delete(key)
      }
    }
    
    // Clear expired questions cache
    for (const [key, entry] of this.questionsCache.entries()) {
      if (!this.isValid(entry, this.DEFAULT_TTL)) {
        this.questionsCache.delete(key)
      }
    }
    
    // Clear expired ID mappings
    for (const [key, entry] of this.specialtyIdCache.entries()) {
      if (!this.isValid(entry, this.ID_MAPPING_TTL)) {
        this.specialtyIdCache.delete(key)
      }
    }
    
    for (const [key, entry] of this.examTypeIdCache.entries()) {
      if (!this.isValid(entry, this.ID_MAPPING_TTL)) {
        this.examTypeIdCache.delete(key)
      }
    }
    
    // Clear expired filter options
    if (this.filterOptionsCache && !this.isValid(this.filterOptionsCache, this.OPTIONS_CACHE_TTL)) {
      this.filterOptionsCache = null
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): FilterCacheStats {
    const totalEntries = this.countCache.size + this.questionsCache.size + 
                        this.specialtyIdCache.size + this.examTypeIdCache.size +
                        (this.filterOptionsCache ? 1 : 0)
    
    const allEntries = [
      ...Array.from(this.countCache.values()),
      ...Array.from(this.questionsCache.values()),
      ...Array.from(this.specialtyIdCache.values()),
      ...Array.from(this.examTypeIdCache.values())
    ]
    
    if (this.filterOptionsCache) {
      allEntries.push(this.filterOptionsCache)
    }
    
    const timestamps = allEntries.map(entry => entry.timestamp)
    const totalHits = this.stats.hits
    const totalMisses = this.stats.misses
    
    return {
      totalEntries,
      totalHits,
      totalMisses,
      hitRate: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0,
      cacheSize: totalEntries,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    }
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.countCache.clear()
    this.questionsCache.clear()
    this.specialtyIdCache.clear()
    this.examTypeIdCache.clear()
    this.filterOptionsCache = null
    this.stats = { hits: 0, misses: 0, evictions: 0 }
  }

  /**
   * Get cache size in MB (approximate)
   */
  getCacheSizeEstimate(): number {
    const jsonString = JSON.stringify({
      countCache: Array.from(this.countCache.entries()),
      questionsCache: Array.from(this.questionsCache.entries()),
      specialtyIdCache: Array.from(this.specialtyIdCache.entries()),
      examTypeIdCache: Array.from(this.examTypeIdCache.entries()),
      filterOptionsCache: this.filterOptionsCache
    })
    
    return jsonString.length / (1024 * 1024) // Convert to MB
  }
}

// Export singleton instance
export const ultraFastFilterCache = new UltraFastFilterCache()

// Auto-cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    ultraFastFilterCache.clearExpired()
  }, 5 * 60 * 1000)
}