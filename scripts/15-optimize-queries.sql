-- Create optimized functions for better query performance

-- Function to get distinct years efficiently
CREATE OR REPLACE FUNCTION get_distinct_years()
RETURNS TABLE(year INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT q.year
    FROM questions q
    WHERE q.year IS NOT NULL
    ORDER BY q.year DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to count questions with filters efficiently
CREATE OR REPLACE FUNCTION count_questions_with_filters(
    specialty_names TEXT[] DEFAULT NULL,
    exam_type_names TEXT[] DEFAULT NULL,
    years INTEGER[] DEFAULT NULL,
    difficulties INTEGER[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    query_count INTEGER;
    specialty_ids UUID[];
    exam_type_ids UUID[];
BEGIN
    -- Get specialty IDs if specialty names provided
    IF specialty_names IS NOT NULL AND array_length(specialty_names, 1) > 0 THEN
        SELECT array_agg(s.id) INTO specialty_ids
        FROM specialties s
        WHERE s.name = ANY(specialty_names);
    END IF;

    -- Get exam type IDs if exam type names provided
    IF exam_type_names IS NOT NULL AND array_length(exam_type_names, 1) > 0 THEN
        SELECT array_agg(e.id) INTO exam_type_ids
        FROM exam_types e
        WHERE e.name = ANY(exam_type_names);
    END IF;

    -- Count questions with filters
    SELECT COUNT(*)::INTEGER INTO query_count
    FROM questions q
    WHERE (specialty_ids IS NULL OR q.specialty_id = ANY(specialty_ids))
      AND (exam_type_ids IS NULL OR q.exam_type_id = ANY(exam_type_ids))
      AND (years IS NULL OR q.year = ANY(years))
      AND (difficulties IS NULL OR q.difficulty = ANY(difficulties));

    RETURN query_count;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance on commonly filtered columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_year_specialty ON questions(year, specialty_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_year_exam_type ON questions(year, exam_type_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_difficulty_specialty ON questions(difficulty, specialty_id);

-- Add a composite index for the most common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_filters ON questions(specialty_id, exam_type_id, year, difficulty);

-- Analyze tables to update statistics for better query planning
ANALYZE questions;
ANALYZE specialties;
ANALYZE exam_types;