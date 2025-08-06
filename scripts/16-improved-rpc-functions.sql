-- Improved RPC functions for better performance and reliability

-- Drop and recreate the get_distinct_years function with better error handling
DROP FUNCTION IF EXISTS get_distinct_years();

CREATE OR REPLACE FUNCTION get_distinct_years()
RETURNS TABLE(year INTEGER) AS $$
DECLARE
    rec RECORD;
    years_count INTEGER;
BEGIN
    -- First, check if we have any questions at all
    SELECT COUNT(*) INTO years_count FROM questions WHERE year IS NOT NULL;
    
    IF years_count = 0 THEN
        RAISE NOTICE 'No questions with years found in database';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found % questions with year values', years_count;
    
    -- Return all distinct years, ordered by year descending
    RETURN QUERY
    SELECT DISTINCT q.year
    FROM questions q
    WHERE q.year IS NOT NULL
    ORDER BY q.year DESC;
    
    -- Log the results
    GET DIAGNOSTICS years_count = ROW_COUNT;
    RAISE NOTICE 'Returning % distinct years', years_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get year statistics for debugging
CREATE OR REPLACE FUNCTION get_year_statistics()
RETURNS TABLE(
    year INTEGER,
    question_count BIGINT,
    min_difficulty INTEGER,
    max_difficulty INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.year,
        COUNT(*) as question_count,
        MIN(q.difficulty) as min_difficulty,
        MAX(q.difficulty) as max_difficulty
    FROM questions q
    WHERE q.year IS NOT NULL
    GROUP BY q.year
    ORDER BY q.year DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get total question count for debugging
CREATE OR REPLACE FUNCTION get_total_question_count()
RETURNS INTEGER AS $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM questions;
    RAISE NOTICE 'Total questions in database: %', total_count;
    RETURN total_count;
END;
$$ LANGUAGE plpgsql;

-- Add some useful indexes if they don't exist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_year_not_null ON questions(year) WHERE year IS NOT NULL;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION get_distinct_years() TO authenticated;
GRANT EXECUTE ON FUNCTION get_year_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_question_count() TO authenticated;

-- Analyze the questions table to update statistics
ANALYZE questions;