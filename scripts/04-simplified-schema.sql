-- Drop the answer_choices column and add individual choice columns
ALTER TABLE questions DROP COLUMN IF EXISTS answer_choices;

-- Add individual choice columns
ALTER TABLE questions ADD COLUMN choice_a TEXT;
ALTER TABLE questions ADD COLUMN choice_b TEXT;
ALTER TABLE questions ADD COLUMN choice_c TEXT;
ALTER TABLE questions ADD COLUMN choice_d TEXT;
ALTER TABLE questions ADD COLUMN choice_e TEXT;
ALTER TABLE questions ADD COLUMN choice_f TEXT;
ALTER TABLE questions ADD COLUMN correct_answer TEXT CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E', 'F'));

-- Update existing questions if any (this would be manual based on your data)
-- You can populate these columns from your existing data as needed
