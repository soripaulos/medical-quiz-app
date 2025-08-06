-- Fix query limits and ensure RPC functions can handle large datasets

-- Improved function to get distinct years efficiently without limits
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

-- Improved function to count questions with filters efficiently
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
    -- Get specialty IDs if specialty names provided (no limits)
    IF specialty_names IS NOT NULL AND array_length(specialty_names, 1) > 0 THEN
        SELECT array_agg(s.id) INTO specialty_ids
        FROM specialties s
        WHERE s.name = ANY(specialty_names);
    END IF;

    -- Get exam type IDs if exam type names provided (no limits)
    IF exam_type_names IS NOT NULL AND array_length(exam_type_names, 1) > 0 THEN
        SELECT array_agg(e.id) INTO exam_type_ids
        FROM exam_types e
        WHERE e.name = ANY(exam_type_names);
    END IF;

    -- Count questions with filters (no limits)
    SELECT COUNT(*)::INTEGER INTO query_count
    FROM questions q
    WHERE (specialty_ids IS NULL OR q.specialty_id = ANY(specialty_ids))
      AND (exam_type_ids IS NULL OR q.exam_type_id = ANY(exam_type_ids))
      AND (years IS NULL OR q.year = ANY(years))
      AND (difficulties IS NULL OR q.difficulty = ANY(difficulties));

    RETURN query_count;
END;
$$ LANGUAGE plpgsql;

-- Add a function to get question status data efficiently for large datasets
CREATE OR REPLACE FUNCTION get_user_question_status_summary(
    p_user_id UUID
)
RETURNS TABLE(
    total_answered BIGINT,
    total_correct BIGINT,
    total_incorrect BIGINT,
    total_flagged BIGINT,
    total_questions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH question_stats AS (
        SELECT 
            COUNT(*) as total_questions
        FROM questions
    ),
    answer_stats AS (
        SELECT 
            COUNT(DISTINCT ua.question_id) as answered_count,
            COUNT(DISTINCT CASE WHEN ua.is_correct THEN ua.question_id END) as correct_count,
            COUNT(DISTINCT CASE WHEN NOT ua.is_correct THEN ua.question_id END) as incorrect_count
        FROM user_answers ua
        WHERE ua.user_id = p_user_id
          AND ua.answered_at = (
              SELECT MAX(ua2.answered_at) 
              FROM user_answers ua2 
              WHERE ua2.user_id = ua.user_id 
                AND ua2.question_id = ua.question_id
          )
    ),
    flagged_stats AS (
        SELECT 
            COUNT(DISTINCT uqp.question_id) as flagged_count
        FROM user_question_progress uqp
        WHERE uqp.user_id = p_user_id
          AND uqp.is_flagged = true
    )
    SELECT 
        COALESCE(a.answered_count, 0) as total_answered,
        COALESCE(a.correct_count, 0) as total_correct,
        COALESCE(a.incorrect_count, 0) as total_incorrect,
        COALESCE(f.flagged_count, 0) as total_flagged,
        q.total_questions
    FROM question_stats q
    CROSS JOIN answer_stats a
    CROSS JOIN flagged_stats f;
END;
$$ LANGUAGE plpgsql;

-- Ensure indexes are optimized for large datasets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_year ON questions(year) WHERE year IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_answers_user_question ON user_answers(user_id, question_id, answered_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_question_progress_user_flagged ON user_question_progress(user_id, question_id) WHERE is_flagged = true;

-- Update table statistics
ANALYZE questions;
ANALYZE user_answers;
ANALYZE user_question_progress;
ANALYZE specialties;
ANALYZE exam_types;