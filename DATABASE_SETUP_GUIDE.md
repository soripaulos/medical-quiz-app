# Database Setup Guide

## Issue Identified
The database connection is working, but the database is **empty**. There are no:
- Questions
- Specialties  
- Exam Types

This is why:
1. **Test creation fails** - No questions available to create tests
2. **Results show no answers** - No questions to answer

## Required Database Tables and Sample Data

### 1. Specialties Table
```sql
-- Create specialties
INSERT INTO specialties (id, name, description) VALUES
('cardiology', 'Cardiology', 'Heart and cardiovascular system'),
('neurology', 'Neurology', 'Brain and nervous system'),
('internal-medicine', 'Internal Medicine', 'General internal medicine'),
('surgery', 'Surgery', 'General surgery'),
('pediatrics', 'Pediatrics', 'Children''s medicine'),
('psychiatry', 'Psychiatry', 'Mental health');
```

### 2. Exam Types Table
```sql
-- Create exam types
INSERT INTO exam_types (id, name, description) VALUES
('usmle-step1', 'USMLE Step 1', 'United States Medical Licensing Examination Step 1'),
('usmle-step2', 'USMLE Step 2', 'United States Medical Licensing Examination Step 2'),
('usmle-step3', 'USMLE Step 3', 'United States Medical Licensing Examination Step 3'),
('nbme', 'NBME', 'National Board of Medical Examiners'),
('shelf', 'Shelf Exam', 'NBME Subject Examinations');
```

### 3. Sample Questions
```sql
-- Sample questions for testing
INSERT INTO questions (
  id, 
  question_text, 
  choice_a, 
  choice_b, 
  choice_c, 
  choice_d, 
  choice_e,
  correct_answer, 
  explanation, 
  sources,
  difficulty, 
  year,
  specialty_id,
  exam_type_id
) VALUES
(
  'q1-cardiology-basic',
  'A 45-year-old man presents with chest pain that occurs with exertion and is relieved by rest. What is the most likely diagnosis?',
  'Myocardial infarction',
  'Stable angina',
  'Unstable angina',
  'Costochondritis',
  'Pulmonary embolism',
  'B',
  'Stable angina is characterized by chest pain that occurs predictably with exertion and is relieved by rest. This is due to fixed coronary artery stenosis that limits blood flow during increased cardiac demand.',
  'Harrison''s Principles of Internal Medicine, 21st Edition',
  1,
  2023,
  'cardiology',
  'usmle-step1'
),
(
  'q2-neurology-basic',
  'A 65-year-old woman presents with sudden onset of weakness on the right side of her body and difficulty speaking. What is the most likely diagnosis?',
  'Migraine',
  'Seizure',
  'Stroke',
  'Brain tumor',
  'Multiple sclerosis',
  'C',
  'Acute onset of focal neurological deficits (hemiparesis and aphasia) in an elderly patient is most consistent with stroke, particularly ischemic stroke.',
  'Adams and Victor''s Principles of Neurology',
  2,
  2023,
  'neurology',
  'usmle-step2'
),
(
  'q3-internal-medicine',
  'A 55-year-old diabetic patient presents with fever, dysuria, and flank pain. Urinalysis shows WBC casts. What is the most appropriate initial treatment?',
  'Oral ciprofloxacin',
  'IV ceftriaxone',
  'Oral trimethoprim-sulfamethoxazole',
  'IV vancomycin',
  'Oral nitrofurantoin',
  'B',
  'This presentation is consistent with pyelonephritis in a diabetic patient. IV antibiotics like ceftriaxone are preferred for initial treatment of complicated UTI/pyelonephritis.',
  'Mandell, Douglas, and Bennett''s Principles of Infectious Diseases',
  2,
  2023,
  'internal-medicine',
  'usmle-step2'
),
(
  'q4-surgery-intermediate',
  'A 35-year-old man presents with sudden onset of severe abdominal pain that radiates to his back. He has a history of alcohol use. Serum lipase is elevated. What is the most likely diagnosis?',
  'Peptic ulcer disease',
  'Acute pancreatitis',
  'Cholecystitis',
  'Appendicitis',
  'Bowel obstruction',
  'B',
  'Acute pancreatitis typically presents with severe epigastric pain radiating to the back, especially in patients with alcohol use history. Elevated lipase confirms the diagnosis.',
  'Sabiston Textbook of Surgery',
  2,
  2023,
  'surgery',
  'usmle-step2'
),
(
  'q5-pediatrics-basic',
  'A 2-year-old child presents with fever, cough, and difficulty breathing. Chest X-ray shows consolidation in the right lower lobe. What is the most likely causative organism?',
  'Respiratory syncytial virus',
  'Streptococcus pneumoniae',
  'Haemophilus influenzae',
  'Mycoplasma pneumoniae',
  'Chlamydia pneumoniae',
  'B',
  'Streptococcus pneumoniae is the most common cause of bacterial pneumonia in children, especially with lobar consolidation on chest X-ray.',
  'Nelson Textbook of Pediatrics',
  1,
  2023,
  'pediatrics',
  'usmle-step2'
);
```

## How to Add Data to Your Supabase Database

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL commands above to populate your tables

### Option 2: Using Database Migration
1. Create migration files with the above SQL
2. Run the migrations through your deployment process

### Option 3: Using the Admin Panel (if available)
1. Use the admin interface to add questions, specialties, and exam types
2. Upload questions via CSV or bulk import

## Verification

After adding the data, you can verify by running:

```sql
-- Check if data was added
SELECT COUNT(*) as question_count FROM questions;
SELECT COUNT(*) as specialty_count FROM specialties;  
SELECT COUNT(*) as exam_type_count FROM exam_types;
```

## Expected Results After Setup

Once the database is populated:
- ✅ Test creation will work (questions available)
- ✅ Quiz interface will display questions
- ✅ Answer saving will work properly
- ✅ Results will show answered questions and performance

## Database Schema Requirements

Make sure your database has these tables with the correct structure:

### Questions Table
- `id` (text, primary key)
- `question_text` (text)
- `choice_a`, `choice_b`, `choice_c`, `choice_d`, `choice_e`, `choice_f` (text)
- `correct_answer` (text)
- `explanation` (text)
- `sources` (text)
- `difficulty` (integer)
- `year` (integer)
- `specialty_id` (text, foreign key)
- `exam_type_id` (text, foreign key)

### User Sessions Table
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `session_name` (text)
- `session_type` (text)
- `total_questions` (integer)
- `current_question_index` (integer)
- `time_limit` (integer)
- `time_remaining` (integer)
- `is_active` (boolean)
- `track_progress` (boolean)
- `active_time_seconds` (integer)
- And other session-related fields...

### User Answers Table
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `question_id` (text, foreign key)
- `session_id` (uuid, foreign key)
- `selected_choice_letter` (text)
- `is_correct` (boolean)
- `time_spent` (integer)
- `answered_at` (timestamp)

## Next Steps

1. **Add the sample data** using one of the methods above
2. **Test the application** - try creating a test session
3. **Verify answers are being saved** - complete a test and check results
4. **Add more questions** as needed for your specific use case

The application code is working correctly - it just needs data to work with!