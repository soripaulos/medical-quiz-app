import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "./admin-client"
import { createClient as createServerClient } from "./server"

// Connection health check utility
export async function checkDatabaseConnection(client: any): Promise<boolean> {
  try {
    const { data, error } = await client
      .from('questions')
      .select('id')
      .limit(1)
    
    return !error
  } catch (error) {
    console.error('Database connection check failed:', error)
    return false
  }
}

// Retry wrapper for database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error)
      
      if (attempt === maxRetries) {
        break
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}

// Enhanced query builder with better error handling
export class DatabaseQueryBuilder {
  private client: any
  private tableName: string
  
  constructor(client: any, tableName: string) {
    this.client = client
    this.tableName = tableName
  }
  
  async executeQuery(queryBuilder: (table: any) => any) {
    return withRetry(async () => {
      const result = await queryBuilder(this.client.from(this.tableName))
      
      if (result.error) {
        throw new Error(`Database query failed: ${result.error.message}`)
      }
      
      return result
    })
  }
  
  async count(filters?: Record<string, any>) {
    return this.executeQuery(async (table) => {
      let query = table.select('*', { count: 'exact', head: true })
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            query = query.eq(key, value)
          }
        })
      }
      
      return await query
    })
  }
  
  async findMany(options: {
    select?: string
    filters?: Record<string, any>
    orderBy?: { column: string; ascending?: boolean }
    limit?: number
    offset?: number
  } = {}) {
    return this.executeQuery(async (table) => {
      let query = table.select(options.select || '*')
      
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            if (Array.isArray(value)) {
              query = query.in(key, value)
            } else if (typeof value === 'string' && key.includes('search')) {
              query = query.ilike(key.replace('_search', ''), `%${value}%`)
            } else {
              query = query.eq(key, value)
            }
          }
        })
      }
      
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? false 
        })
      }
      
      if (options.limit) {
        const offset = options.offset || 0
        query = query.range(offset, offset + options.limit - 1)
      }
      
      return await query
    })
  }
}

// Database health monitoring
export class DatabaseHealthMonitor {
  private client: any
  private healthCheckInterval: NodeJS.Timeout | null = null
  private isHealthy: boolean = true
  
  constructor(client: any) {
    this.client = client
  }
  
  async startMonitoring(intervalMs: number = 30000) {
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await checkDatabaseConnection(this.client)
      
      if (this.isHealthy !== isHealthy) {
        this.isHealthy = isHealthy
        console.log(`Database health status changed: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`)
      }
    }, intervalMs)
  }
  
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
  
  getHealthStatus() {
    return this.isHealthy
  }
}

// Optimized query helpers
export const optimizedQueries = {
  async getDistinctYears() {
    try {
      const adminClient = createAdminClient()
      
      return withRetry(async () => {
        // Try RPC function first
        try {
          const { data, error } = await adminClient.rpc('get_distinct_years')
          if (!error && data) {
            return { data: (data as number[]).sort((a: number, b: number) => b - a), method: 'rpc' }
          }
        } catch (e) {
          console.warn('RPC function not available, using fallback')
        }
        
        // Fallback to direct query
        const { data, error } = await adminClient
          .from('questions')
          .select('year')
          .not('year', 'is', null)
          .order('year', { ascending: false })
        
        if (error) throw error
        
        const uniqueYears = [...new Set(data?.map((q: any) => q.year).filter(Boolean))] as number[]
        return { 
          data: uniqueYears.sort((a: number, b: number) => b - a), 
          method: 'fallback' 
        }
      })
    } catch (error) {
      // Handle build-time errors gracefully
      console.warn('Error in getDistinctYears:', error)
      return { data: [], method: 'error' }
    }
  },
  
  async getTotalQuestionCount(filters?: Record<string, any>) {
    try {
      const adminClient = createAdminClient()
      const queryBuilder = new DatabaseQueryBuilder(adminClient, 'questions')
      
      const result = await queryBuilder.count(filters)
      return result.count || 0
    } catch (error) {
      // Handle build-time errors gracefully
      console.warn('Error in getTotalQuestionCount:', error)
      return 0
    }
  },
  
  async getFilteredQuestions(options: {
    page?: number
    limit?: number
    search?: string
    specialty?: string
    examType?: string
    difficulty?: number
    year?: number
    userId?: string
  }) {
    try {
      const serverClient = await createServerClient()
      const queryBuilder = new DatabaseQueryBuilder(serverClient, 'questions')
      
      const filters: Record<string, any> = {}
      
      if (options.specialty && options.specialty !== 'all') {
        // Get specialty ID
        const { data: specialtyData, error: specialtyError } = await serverClient
          .from('specialties')
          .select('id')
          .eq('name', options.specialty)
          .single()
        
        if (!specialtyError && specialtyData) {
          filters.specialty_id = (specialtyData as any).id
        }
      }
      
      if (options.examType && options.examType !== 'all') {
        // Get exam type ID
        const { data: examTypeData, error: examTypeError } = await serverClient
          .from('exam_types')
          .select('id')
          .eq('name', options.examType)
          .single()
        
        if (!examTypeError && examTypeData) {
          filters.exam_type_id = (examTypeData as any).id
        }
      }
      
      if (options.difficulty) {
        filters.difficulty = options.difficulty
      }
      
      if (options.year) {
        filters.year = options.year
      }
      
      if (options.search) {
        filters.question_text_search = options.search
      }
      
      const result = await queryBuilder.findMany({
        select: `
          *,
          specialty:specialties(id, name),
          exam_type:exam_types(id, name)
        `,
        filters,
        orderBy: { column: 'created_at', ascending: false },
        limit: options.limit || 50,
        offset: ((options.page || 1) - 1) * (options.limit || 50)
      })
      
      return result
    } catch (error) {
      // Handle build-time errors gracefully
      console.warn('Error in getFilteredQuestions:', error)
      return { data: [], count: 0, error }
    }
  }
}

// Export singleton instances
export const dbHealthMonitor = new DatabaseHealthMonitor(createAdminClient())