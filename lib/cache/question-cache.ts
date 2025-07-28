// Comprehensive caching system for questions and filter data
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

interface FilterOptions {
  specialties: string[]
  examTypes: string[]
  years: number[]
  difficulties: number[]
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

class QuestionCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly YEARS_TTL = 30 * 60 * 1000 // 30 minutes (years change rarely)
  private readonly FILTER_OPTIONS_TTL = 10 * 60 * 1000 // 10 minutes
  private readonly QUESTIONS_TTL = 2 * 60 * 1000 // 2 minutes for questions

  private generateKey(prefix: string, params?: any): string {
    if (!params) return prefix
    
    // Create a stable key from parameters
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        const value = params[key]
        if (Array.isArray(value)) {
          result[key] = [...value].sort()
        } else {
          result[key] = value
        }
        return result
      }, {} as any)
    
    return `${prefix}:${JSON.stringify(sortedParams)}`
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  private get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry || this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }
    return entry.data as T
  }

  // Cache years data
  setYears(years: number[]): void {
    this.set('years', years, this.YEARS_TTL)
  }

  getYears(): number[] | null {
    return this.get<number[]>('years')
  }

  // Cache filter options
  setFilterOptions(options: FilterOptions): void {
    this.set('filter_options', options, this.FILTER_OPTIONS_TTL)
  }

  getFilterOptions(): FilterOptions | null {
    return this.get<FilterOptions>('filter_options')
  }

  // Cache filtered questions
  setFilteredQuestions(filters: QuestionFilters, userId: string, limit: number, offset: number, data: CachedQuestions): void {
    const key = this.generateKey('filtered_questions', { filters, userId, limit, offset })
    this.set(key, data, this.QUESTIONS_TTL)
  }

  getFilteredQuestions(filters: QuestionFilters, userId: string, limit: number, offset: number): CachedQuestions | null {
    const key = this.generateKey('filtered_questions', { filters, userId, limit, offset })
    return this.get<CachedQuestions>(key)
  }

  // Cache question counts
  setQuestionCount(filters: QuestionFilters, count: number): void {
    const key = this.generateKey('question_count', filters)
    this.set(key, count, this.QUESTIONS_TTL)
  }

  getQuestionCount(filters: QuestionFilters): number | null {
    const key = this.generateKey('question_count', filters)
    return this.get<number>(key)
  }

  // Cache specialty/exam type ID mappings
  setSpecialtyIds(names: string[], ids: number[]): void {
    const key = this.generateKey('specialty_ids', { names: names.sort() })
    this.set(key, ids, this.FILTER_OPTIONS_TTL)
  }

  getSpecialtyIds(names: string[]): number[] | null {
    const key = this.generateKey('specialty_ids', { names: names.sort() })
    return this.get<number[]>(key)
  }

  setExamTypeIds(names: string[], ids: number[]): void {
    const key = this.generateKey('exam_type_ids', { names: names.sort() })
    this.set(key, ids, this.FILTER_OPTIONS_TTL)
  }

  getExamTypeIds(names: string[]): number[] | null {
    const key = this.generateKey('exam_type_ids', { names: names.sort() })
    return this.get<number[]>(key)
  }

  // Clear cache methods
  clearAll(): void {
    this.cache.clear()
  }

  clearQuestions(): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith('filtered_questions') || key.startsWith('question_count')) {
        this.cache.delete(key)
      }
    }
  }

  clearFilterOptions(): void {
    this.cache.delete('filter_options')
    this.cache.delete('years')
    for (const key of this.cache.keys()) {
      if (key.startsWith('specialty_ids') || key.startsWith('exam_type_ids')) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  // Cleanup expired entries
  cleanup(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instance
export const questionCache = new QuestionCache()

// Periodic cleanup every 5 minutes
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    questionCache.cleanup()
  }, 5 * 60 * 1000)
}