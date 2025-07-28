-- Enhanced filtering optimization for medical quiz app
-- This script creates advanced indexes and optimizations for better filtering performance

-- Drop existing indexes if they exist to recreate with better configurations
DROP INDEX IF EXISTS idx_questions_year;
DROP INDEX IF EXISTS idx_questions_difficulty;
DROP INDEX IF EXISTS idx_questions_specialty_id;
DROP INDEX IF EXISTS idx_questions_exam_type_id;

-- Create optimized single-column indexes with better selectivity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_year_optimized 
ON questions(year) 
WHERE year IS NOT NULL
INCLUDE (id, specialty_id, exam_type_id, difficulty);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_difficulty_optimized 
ON questions(difficulty) 
WHERE difficulty IS NOT NULL
INCLUDE (id, year, specialty_id, exam_type_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_specialty_id_optimized 
ON questions(specialty_id) 
WHERE specialty_id IS NOT NULL
INCLUDE (id, year, difficulty, exam_type_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_exam_type_id_optimized 
ON questions(exam_type_id) 
WHERE exam_type_id IS NOT NULL
INCLUDE (id, year, difficulty, specialty_id);

-- Create composite indexes for common filter combinations (most selective first)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_year_specialty_difficulty 
ON questions(year, specialty_id, difficulty) 
WHERE year IS NOT NULL AND specialty_id IS NOT NULL AND difficulty IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_year_examtype_difficulty 
ON questions(year, exam_type_id, difficulty) 
WHERE year IS NOT NULL AND exam_type_id IS NOT NULL AND difficulty IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_specialty_examtype_year 
ON questions(specialty_id, exam_type_id, year) 
WHERE specialty_id IS NOT NULL AND exam_type_id IS NOT NULL AND year IS NOT NULL;

-- Optimize user progress queries for status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_answers_status_lookup 
ON user_answers(user_id, question_id, is_correct, answered_at) 
WHERE user_id IS NOT NULL AND question_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_flagged_lookup 
ON user_question_progress(user_id, question_id, is_flagged) 
WHERE user_id IS NOT NULL AND question_id IS NOT NULL AND is_flagged = true;

-- Optimize lookup tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_specialties_name_hash 
ON specialties USING hash(name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_types_name_hash 
ON exam_types USING hash(name);

-- Create an optimized function for getting distinct years with better performance
CREATE OR REPLACE FUNCTION get_distinct_years_optimized()
RETURNS INTEGER[] AS $$
DECLARE
    years INTEGER[];
BEGIN
    -- Use the optimized index and return as array for better performance
    SELECT array_agg(DISTINCT year ORDER BY year DESC)
    INTO years
    FROM questions 
    WHERE year IS NOT NULL;
    
    RETURN COALESCE(years, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for fast specialty/exam type ID lookups
CREATE OR REPLACE FUNCTION get_specialty_ids(specialty_names TEXT[])
RETURNS INTEGER[] AS $$
DECLARE
    ids INTEGER[];
BEGIN
    SELECT array_agg(id)
    INTO ids
    FROM specialties 
    WHERE name = ANY(specialty_names);
    
    RETURN COALESCE(ids, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_exam_type_ids(exam_type_names TEXT[])
RETURNS INTEGER[] AS $$
DECLARE
    ids INTEGER[];
BEGIN
    SELECT array_agg(id)
    INTO ids
    FROM exam_types 
    WHERE name = ANY(exam_type_names);
    
    RETURN COALESCE(ids, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create an optimized filtering function that uses all the indexes
CREATE OR REPLACE FUNCTION get_filtered_questions(
    p_specialty_ids INTEGER[] DEFAULT NULL,
    p_exam_type_ids INTEGER[] DEFAULT NULL,
    p_years INTEGER[] DEFAULT NULL,
    p_difficulties INTEGER[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 5000,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    question_text TEXT,
    choice_a TEXT,
    choice_b TEXT,
    choice_c TEXT,
    choice_d TEXT,
    choice_e TEXT,
    choice_f TEXT,
    correct_answer TEXT,
    explanation TEXT,
    explanation_image_url TEXT,
    sources TEXT,
    difficulty INTEGER,
    year INTEGER,
    specialty_id INTEGER,
    exam_type_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    specialty_name TEXT,
    exam_type_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.question_text,
        q.choice_a,
        q.choice_b,
        q.choice_c,
        q.choice_d,
        q.choice_e,
        q.choice_f,
        q.correct_answer,
        q.explanation,
        q.explanation_image_url,
        q.sources,
        q.difficulty,
        q.year,
        q.specialty_id,
        q.exam_type_id,
        q.created_at,
        s.name as specialty_name,
        e.name as exam_type_name
    FROM questions q
    LEFT JOIN specialties s ON q.specialty_id = s.id
    LEFT JOIN exam_types e ON q.exam_type_id = e.id
    WHERE 
        (p_years IS NULL OR q.year = ANY(p_years))
        AND (p_difficulties IS NULL OR q.difficulty = ANY(p_difficulties))
        AND (p_specialty_ids IS NULL OR q.specialty_id = ANY(p_specialty_ids))
        AND (p_exam_type_ids IS NULL OR q.exam_type_id = ANY(p_exam_type_ids))
    ORDER BY q.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get count of filtered questions
CREATE OR REPLACE FUNCTION count_filtered_questions(
    p_specialty_ids INTEGER[] DEFAULT NULL,
    p_exam_type_ids INTEGER[] DEFAULT NULL,
    p_years INTEGER[] DEFAULT NULL,
    p_difficulties INTEGER[] DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    question_count BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO question_count
    FROM questions q
    WHERE 
        (p_years IS NULL OR q.year = ANY(p_years))
        AND (p_difficulties IS NULL OR q.difficulty = ANY(p_difficulties))
        AND (p_specialty_ids IS NULL OR q.specialty_id = ANY(p_specialty_ids))
        AND (p_exam_type_ids IS NULL OR q.exam_type_id = ANY(p_exam_type_ids));
    
    RETURN question_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_distinct_years_optimized() TO authenticated;
GRANT EXECUTE ON FUNCTION get_specialty_ids(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_exam_type_ids(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_filtered_questions(INTEGER[], INTEGER[], INTEGER[], INTEGER[], INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION count_filtered_questions(INTEGER[], INTEGER[], INTEGER[], INTEGER[]) TO authenticated;

-- Update table statistics
ANALYZE questions;
ANALYZE specialties;
ANALYZE exam_types;
ANALYZE user_question_progress;
ANALYZE user_answers;

-- Create partial indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_recent_by_specialty 
ON questions(specialty_id, created_at DESC) 
WHERE created_at > (NOW() - INTERVAL '2 years');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_recent_by_year 
ON questions(year, created_at DESC) 
WHERE year >= 2020;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Enhanced filtering optimization completed at %', NOW();
END $$;