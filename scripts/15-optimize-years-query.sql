-- Create a function to efficiently get distinct years from questions table
-- This is more efficient than fetching all records and filtering in the application

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

-- Create an index on the year column if it doesn't exist for better performance
CREATE INDEX IF NOT EXISTS idx_questions_year ON questions(year) WHERE year IS NOT NULL;