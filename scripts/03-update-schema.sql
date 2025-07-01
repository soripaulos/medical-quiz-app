-- Add answer_choices column to questions table
ALTER TABLE questions ADD COLUMN answer_choices JSONB;

-- Update existing questions to move answer choices to the new column
UPDATE questions 
SET answer_choices = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'letter', choice_letter,
      'text', choice_text,
      'is_correct', is_correct
    )
  )
  FROM answer_choices 
  WHERE answer_choices.question_id = questions.id
);

-- Drop the separate answer_choices table
DROP TABLE IF EXISTS answer_choices CASCADE;

-- Update the types to reflect the new structure
