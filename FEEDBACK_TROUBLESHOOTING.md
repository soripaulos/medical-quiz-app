# Question Feedback Troubleshooting Guide

## Error: "new row for relation 'question_feedbacks' violates check constraint"

This error occurs when the feedback data being submitted doesn't match the database constraints.

### Quick Fix Steps

1. **Run the Updated Database Script**
   ```sql
   -- Execute this in your Supabase SQL editor
   -- File: scripts/create-question-feedbacks-table-fixed.sql
   ```

2. **Verify Table Setup**
   ```sql
   -- Run the test script to check table structure
   -- File: scripts/test-feedback-table.sql
   ```

3. **Check Browser Console**
   - Open browser dev tools
   - Look for the console.log showing the feedback data being submitted
   - Verify the feedback_type value matches allowed types

### Common Causes & Solutions

#### 1. Table Doesn't Exist
**Symptoms**: Table not found error or constraint violation
**Solution**: Run the database creation script first

#### 2. Wrong Feedback Type Values
**Symptoms**: Check constraint violation on feedback_type
**Solution**: Ensure these exact values are used:
- `answer_correction`
- `faulty_question`
- `incorrect_explanation`
- `incomplete_information`
- `typo_grammar`
- `image_issue`
- `source_problem`

#### 3. Invalid Suggested Answer
**Symptoms**: Check constraint violation on suggested_correct_answer
**Solution**: Only use: `A`, `B`, `C`, `D`, `E`, `F` or `null`

#### 4. Missing Foreign Key References
**Symptoms**: Foreign key constraint violation
**Solution**: Ensure user_id, question_id, and session_id (if provided) exist in their respective tables

### Debugging Steps

1. **Enable Debug Logging**
   The component already includes console.log for debugging. Check browser console for:
   ```javascript
   console.log('Submitting feedback data:', feedbackData)
   ```

2. **Check Database Constraints**
   ```sql
   -- Run in Supabase SQL editor
   SELECT cc.constraint_name, cc.check_clause
   FROM information_schema.check_constraints cc
   JOIN information_schema.constraint_column_usage ccu 
     ON cc.constraint_name = ccu.constraint_name
   WHERE ccu.table_name = 'question_feedbacks';
   ```

3. **Verify Data Types**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns 
   WHERE table_name = 'question_feedbacks';
   ```

4. **Test Manual Insert**
   ```sql
   -- Replace with actual IDs from your database
   INSERT INTO question_feedbacks (user_id, question_id, feedback_type) 
   VALUES ('actual-user-id', 'actual-question-id', 'faulty_question');
   ```

### Database Setup Verification

Run this query to verify your setup:

```sql
-- Check if table exists and has correct structure
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  tc.constraint_type
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN information_schema.key_column_usage kcu ON c.column_name = kcu.column_name AND c.table_name = kcu.table_name
LEFT JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
WHERE t.table_name = 'question_feedbacks'
ORDER BY c.ordinal_position;
```

### RLS Policy Issues

If you get permission errors, check RLS policies:

```sql
-- View current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'question_feedbacks';

-- Temporarily disable RLS for testing (re-enable after)
-- ALTER TABLE question_feedbacks DISABLE ROW LEVEL SECURITY;
```

### Component-Level Debugging

Add this to the component for more detailed debugging:

```typescript
// In question-feedback.tsx, before the insert
console.log('Selected type:', selectedType)
console.log('Suggested answer:', suggestedAnswer)
console.log('User ID:', user.id)
console.log('Question ID:', question.id)
console.log('Session ID:', sessionId)
```

### Environment Issues

1. **Check Supabase Connection**
   - Verify NEXT_PUBLIC_SUPABASE_URL
   - Verify NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Check network connectivity

2. **Authentication Issues**
   - Ensure user is logged in
   - Check user.id is valid UUID
   - Verify user exists in profiles table

### Contact Support

If the issue persists:

1. **Provide Error Details**:
   - Full error message from console
   - Browser network tab showing the failed request
   - Database table structure output

2. **Include Debug Info**:
   - Console.log output showing the data being submitted
   - Results from test-feedback-table.sql script
   - Current RLS policies

3. **Environment Details**:
   - Browser and version
   - Supabase project region
   - Any custom database modifications

### Recovery Steps

If you need to start fresh:

```sql
-- 1. Drop the table completely
DROP TABLE IF EXISTS question_feedbacks CASCADE;

-- 2. Run the fixed creation script
-- (Use create-question-feedbacks-table-fixed.sql)

-- 3. Verify with test script
-- (Use test-feedback-table.sql)

-- 4. Test with a simple insert
INSERT INTO question_feedbacks (user_id, question_id, feedback_type) 
VALUES ('your-actual-user-id', 'your-actual-question-id', 'faulty_question');
```