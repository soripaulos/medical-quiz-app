-- Optimize database indexes for better query performance
-- This script creates indexes on commonly queried columns

-- Questions table indexes
CREATE INDEX IF NOT EXISTS idx_questions_year ON questions(year) WHERE year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty) WHERE difficulty IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_specialty_id ON questions(specialty_id) WHERE specialty_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_exam_type_id ON questions(exam_type_id) WHERE exam_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);
CREATE INDEX IF NOT EXISTS idx_questions_question_text_gin ON questions USING gin(to_tsvector('english', question_text));

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_questions_specialty_year ON questions(specialty_id, year) WHERE specialty_id IS NOT NULL AND year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_examtype_year ON questions(exam_type_id, year) WHERE exam_type_id IS NOT NULL AND year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_specialty_difficulty ON questions(specialty_id, difficulty) WHERE specialty_id IS NOT NULL AND difficulty IS NOT NULL;

-- User progress and answers indexes for faster status filtering
CREATE INDEX IF NOT EXISTS idx_user_question_progress_user_id ON user_question_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_progress_question_id ON user_question_progress(question_id);
CREATE INDEX IF NOT EXISTS idx_user_question_progress_user_question ON user_question_progress(user_id, question_id);

CREATE INDEX IF NOT EXISTS idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_question ON user_answers(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_answered_at ON user_answers(answered_at);

-- Specialties and exam_types indexes
CREATE INDEX IF NOT EXISTS idx_specialties_name ON specialties(name);
CREATE INDEX IF NOT EXISTS idx_exam_types_name ON exam_types(name);

-- Update the get_distinct_years function to be more efficient
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_distinct_years() TO authenticated;

-- Create a function to get question counts by filters for better performance
CREATE OR REPLACE FUNCTION get_question_counts_by_filters()
RETURNS TABLE(
    total_count BIGINT,
    by_specialty JSONB,
    by_year JSONB,
    by_difficulty JSONB,
    by_exam_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM questions)::BIGINT as total_count,
        (SELECT jsonb_object_agg(s.name, counts.count)
         FROM (
             SELECT s.name, COUNT(q.id) as count
             FROM specialties s
             LEFT JOIN questions q ON s.id = q.specialty_id
             GROUP BY s.id, s.name
         ) counts
         JOIN specialties s ON s.name = counts.name
        ) as by_specialty,
        (SELECT jsonb_object_agg(year_counts.year::text, year_counts.count)
         FROM (
             SELECT q.year, COUNT(*) as count
             FROM questions q
             WHERE q.year IS NOT NULL
             GROUP BY q.year
             ORDER BY q.year DESC
         ) year_counts
        ) as by_year,
        (SELECT jsonb_object_agg(diff_counts.difficulty::text, diff_counts.count)
         FROM (
             SELECT q.difficulty, COUNT(*) as count
             FROM questions q
             WHERE q.difficulty IS NOT NULL
             GROUP BY q.difficulty
             ORDER BY q.difficulty
         ) diff_counts
        ) as by_difficulty,
        (SELECT jsonb_object_agg(e.name, exam_counts.count)
         FROM (
             SELECT e.name, COUNT(q.id) as count
             FROM exam_types e
             LEFT JOIN questions q ON e.id = q.exam_type_id
             GROUP BY e.id, e.name
         ) exam_counts
         JOIN exam_types e ON e.name = exam_counts.name
        ) as by_exam_type;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_question_counts_by_filters() TO authenticated;

-- Create a materialized view for faster dashboard stats (optional, can be refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
    COUNT(*) as total_questions,
    COUNT(DISTINCT year) as total_years,
    COUNT(DISTINCT specialty_id) as total_specialties,
    COUNT(DISTINCT exam_type_id) as total_exam_types,
    MIN(year) as earliest_year,
    MAX(year) as latest_year,
    AVG(difficulty) as avg_difficulty,
    NOW() as last_updated
FROM questions
WHERE year IS NOT NULL;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_unique ON dashboard_stats(last_updated);

-- Grant select permission to authenticated users
GRANT SELECT ON dashboard_stats TO authenticated;

-- Analyze tables to update statistics for query planner
ANALYZE questions;
ANALYZE specialties;
ANALYZE exam_types;
ANALYZE user_question_progress;
ANALYZE user_answers;