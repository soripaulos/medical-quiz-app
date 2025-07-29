-- Comprehensive Years Filter Optimization
-- This script addresses the persistent issue of year filter showing only 3 options
-- and implements high-performance indexing and caching strategies

-- Drop existing year-related indexes and functions to rebuild optimally
DROP INDEX IF EXISTS idx_questions_year;
DROP INDEX IF EXISTS idx_questions_year_optimized;
DROP FUNCTION IF EXISTS get_distinct_years();
DROP FUNCTION IF EXISTS get_distinct_years_optimized();

-- Create a highly optimized year index with covering columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_year_comprehensive
ON questions(year DESC) 
WHERE year IS NOT NULL
INCLUDE (id, specialty_id, exam_type_id, difficulty, created_at);

-- Create a materialized view for year statistics (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_year_stats AS
SELECT 
    year,
    COUNT(*) as question_count,
    COUNT(DISTINCT specialty_id) as specialty_count,
    COUNT(DISTINCT exam_type_id) as exam_type_count,
    MIN(difficulty) as min_difficulty,
    MAX(difficulty) as max_difficulty,
    MIN(created_at) as earliest_question,
    MAX(created_at) as latest_question
FROM questions 
WHERE year IS NOT NULL 
GROUP BY year
ORDER BY year DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_year_stats_year ON mv_year_stats(year);

-- Create function to refresh year stats (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_year_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_year_stats;
    RAISE NOTICE 'Year statistics refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Create optimized function to get distinct years with metadata
CREATE OR REPLACE FUNCTION get_years_with_stats()
RETURNS TABLE(
    year INTEGER,
    question_count BIGINT,
    specialty_count BIGINT,
    exam_type_count BIGINT,
    min_difficulty INTEGER,
    max_difficulty INTEGER
) AS $$
BEGIN
    -- Try to use materialized view first (fastest)
    BEGIN
        RETURN QUERY
        SELECT 
            mv.year,
            mv.question_count,
            mv.specialty_count,
            mv.exam_type_count,
            mv.min_difficulty,
            mv.max_difficulty
        FROM mv_year_stats mv
        ORDER BY mv.year DESC;
        
        -- If we got results, return them
        IF FOUND THEN
            RETURN;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Materialized view might not exist or be corrupted, continue to fallback
        NULL;
    END;
    
    -- Fallback to direct query with optimized aggregation
    RETURN QUERY
    SELECT 
        q.year,
        COUNT(*)::BIGINT as question_count,
        COUNT(DISTINCT q.specialty_id)::BIGINT as specialty_count,
        COUNT(DISTINCT q.exam_type_id)::BIGINT as exam_type_count,
        MIN(q.difficulty) as min_difficulty,
        MAX(q.difficulty) as max_difficulty
    FROM questions q
    WHERE q.year IS NOT NULL
    GROUP BY q.year
    ORDER BY q.year DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create simple function to get just years (for backward compatibility)
CREATE OR REPLACE FUNCTION get_distinct_years()
RETURNS INTEGER[] AS $$
DECLARE
    years INTEGER[];
BEGIN
    -- Use the optimized index to get years quickly
    SELECT array_agg(DISTINCT year ORDER BY year DESC)
    INTO years
    FROM questions 
    WHERE year IS NOT NULL;
    
    -- Return empty array if no years found
    RETURN COALESCE(years, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get years within a range (for filtering optimization)
CREATE OR REPLACE FUNCTION get_years_in_range(
    start_year INTEGER DEFAULT NULL,
    end_year INTEGER DEFAULT NULL
)
RETURNS INTEGER[] AS $$
DECLARE
    years INTEGER[];
BEGIN
    SELECT array_agg(DISTINCT year ORDER BY year DESC)
    INTO years
    FROM questions 
    WHERE year IS NOT NULL
        AND (start_year IS NULL OR year >= start_year)
        AND (end_year IS NULL OR year <= end_year);
    
    RETURN COALESCE(years, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to validate if years exist in database
CREATE OR REPLACE FUNCTION validate_years(input_years INTEGER[])
RETURNS INTEGER[] AS $$
DECLARE
    valid_years INTEGER[];
BEGIN
    SELECT array_agg(year ORDER BY year DESC)
    INTO valid_years
    FROM (
        SELECT DISTINCT year
        FROM questions 
        WHERE year IS NOT NULL 
            AND year = ANY(input_years)
    ) t;
    
    RETURN COALESCE(valid_years, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_years_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_years() TO authenticated;
GRANT EXECUTE ON FUNCTION get_years_in_range(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_years(INTEGER[]) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_year_stats() TO authenticated;

-- Grant select on materialized view
GRANT SELECT ON mv_year_stats TO authenticated;

-- Create a trigger to refresh materialized view when questions are added/updated
CREATE OR REPLACE FUNCTION trigger_refresh_year_stats()
RETURNS trigger AS $$
BEGIN
    -- Refresh asynchronously to avoid blocking the main operation
    PERFORM pg_notify('refresh_year_stats', '');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic refresh
DROP TRIGGER IF EXISTS tr_questions_year_stats ON questions;
CREATE TRIGGER tr_questions_year_stats
    AFTER INSERT OR UPDATE OF year OR DELETE ON questions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_year_stats();

-- Initial refresh of materialized view
SELECT refresh_year_stats();

-- Update table statistics for better query planning
ANALYZE questions;
ANALYZE mv_year_stats;

-- Create additional performance indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_year_specialty_difficulty
ON questions(year, specialty_id, difficulty)
WHERE year IS NOT NULL AND specialty_id IS NOT NULL AND difficulty IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_year_examtype_difficulty  
ON questions(year, exam_type_id, difficulty)
WHERE year IS NOT NULL AND exam_type_id IS NOT NULL AND difficulty IS NOT NULL;

-- Log completion with statistics
DO $$
DECLARE
    total_years INTEGER;
    total_questions INTEGER;
    year_range TEXT;
BEGIN
    SELECT COUNT(DISTINCT year), COUNT(*) 
    INTO total_years, total_questions
    FROM questions WHERE year IS NOT NULL;
    
    SELECT MIN(year) || '-' || MAX(year)
    INTO year_range
    FROM questions WHERE year IS NOT NULL;
    
    RAISE NOTICE 'Years optimization completed at %', NOW();
    RAISE NOTICE 'Found % distinct years (%)', total_years, year_range;
    RAISE NOTICE 'Total questions with years: %', total_questions;
END $$;