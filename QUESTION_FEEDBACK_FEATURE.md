# Question Feedback Feature

This document describes the comprehensive question feedback system that allows users to report issues with questions and suggest corrections.

## Overview

The question feedback feature enables users to:
- Report various types of issues with questions
- Suggest correct answers for incorrect questions
- Provide structured feedback to improve question quality
- Help administrators identify and fix problematic content

## Database Schema

### Table: `question_feedbacks`

```sql
CREATE TABLE question_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'answer_correction',
    'faulty_question', 
    'incorrect_explanation',
    'incomplete_information',
    'typo_grammar',
    'image_issue',
    'source_problem'
  )),
  suggested_correct_answer TEXT CHECK (suggested_correct_answer IN ('A', 'B', 'C', 'D', 'E', 'F')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Indexes
- `idx_question_feedbacks_user_id` - Fast user feedback lookups
- `idx_question_feedbacks_question_id` - Fast question feedback lookups
- `idx_question_feedbacks_session_id` - Session-based filtering
- `idx_question_feedbacks_feedback_type` - Type-based filtering
- `idx_question_feedbacks_created_at` - Chronological sorting
- `idx_question_feedbacks_question_type` - Composite index for common queries

### Row Level Security (RLS)
- Users can view and insert their own feedback
- Admins can view, update, and delete all feedback
- Secure access control prevents unauthorized modifications

## Feedback Types

### 1. Answer Correction
- **Purpose**: Report incorrect answer keys
- **Requirements**: Must select suggested correct answer (A-F)
- **Use Case**: When the marked correct answer is wrong
- **UI**: Shows all answer choices for selection

### 2. Faulty Question
- **Purpose**: Report unclear, ambiguous, or poorly written questions
- **Requirements**: No additional input needed
- **Use Case**: Question is confusing or has multiple valid interpretations

### 3. Incorrect Explanation
- **Purpose**: Report errors in explanations
- **Requirements**: No additional input needed
- **Use Case**: Explanation contains factual errors or misleading information

### 4. Incomplete Information
- **Purpose**: Report missing important details
- **Requirements**: No additional input needed
- **Use Case**: Question lacks necessary context or information

### 5. Typo/Grammar Error
- **Purpose**: Report spelling and grammar mistakes
- **Requirements**: No additional input needed
- **Use Case**: Text contains obvious errors

### 6. Image Issue
- **Purpose**: Report problems with images
- **Requirements**: No additional input needed
- **Use Case**: Images are unclear, missing, or don't load

### 7. Source Problem
- **Purpose**: Report citation or reference issues
- **Requirements**: No additional input needed
- **Use Case**: Sources are incorrect, missing, or inaccessible

## Components

### 1. QuestionFeedback Component

**Location**: `/components/quiz/question-feedback.tsx`

**Props**:
- `question: Question` - The current question object
- `sessionId?: string` - Optional session ID for tracking

**Features**:
- Modal-based interface
- Dynamic form based on feedback type
- Answer choice selection for corrections
- Loading states and error handling
- Success notifications

**Usage**:
```tsx
import { QuestionFeedback } from "@/components/quiz/question-feedback"

<QuestionFeedback 
  question={currentQuestion} 
  sessionId={session.id} 
/>
```

### 2. FeedbackManagement Component (Admin)

**Location**: `/components/admin/feedback-management.tsx`

**Features**:
- View all feedback submissions
- Filter by feedback type
- Search by question, user, or content
- Detailed feedback statistics
- Click-to-view detailed feedback modal

**Usage**:
```tsx
import { FeedbackManagement } from "@/components/admin/feedback-management"

<FeedbackManagement />
```

## Integration

### Quiz Interface Integration

The feedback button is integrated into the quiz interface header alongside other tools:

```tsx
// In quiz-interface.tsx
<div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
  <QuestionFeedback 
    question={currentQuestion} 
    sessionId={session.id} 
  />
  <Button variant="ghost" size="icon" onClick={handleFlagQuestion}>
    <Flag className="h-5 w-5" />
  </Button>
  {/* Other tools... */}
</div>
```

### Database Functions

#### get_question_feedback_stats(question_uuid UUID)
Returns aggregated feedback statistics for a specific question:
- Feedback type counts
- Suggested answer distributions (for corrections)

#### user_has_feedback_for_question(question_uuid UUID, feedback_type_param TEXT)
Checks if a user has already submitted feedback of a specific type for a question.

## User Experience

### Feedback Submission Flow

1. **Trigger**: User clicks "Feedback" button in quiz interface
2. **Type Selection**: User selects feedback type from dropdown
3. **Dynamic Form**: Form adapts based on selected type
4. **Answer Selection**: If "Answer Correction", user selects suggested answer
5. **Validation**: Submit button disabled until requirements met
6. **Submission**: Data sent to Supabase with loading state
7. **Confirmation**: Success message shown, modal closes automatically

### Visual Design

- **Button**: Ghost variant with MessageSquare icon
- **Modal**: Clean, focused design with clear steps
- **Type Selection**: Dropdown with descriptions for each type
- **Answer Selection**: Radio buttons with current answer highlighted
- **Status**: Loading spinners, success/error alerts
- **Responsive**: Works on mobile and desktop

## Administration

### Viewing Feedback

Administrators can access the feedback management interface to:
- View all feedback submissions
- Filter by type, user, or date
- Search through feedback content
- See aggregated statistics
- Review detailed feedback information

### Feedback Statistics

The admin interface shows:
- Total feedback count
- Count per feedback type
- Recent submissions
- User engagement metrics

### Moderation Capabilities

Administrators can:
- View all feedback (bypasses RLS)
- Update feedback entries (for moderation)
- Delete inappropriate feedback
- Export feedback data for analysis

## Setup Instructions

### 1. Database Setup

Execute the SQL script to create the table and functions:

```bash
# Run the SQL script in your Supabase SQL editor
cat scripts/create-question-feedbacks-table.sql
```

### 2. Component Integration

The feedback component is already integrated into the quiz interface. No additional setup required.

### 3. Admin Access

Add the feedback management component to your admin dashboard:

```tsx
import { FeedbackManagement } from "@/components/admin/feedback-management"

// In your admin layout or page
<FeedbackManagement />
```

## Security Considerations

### Row Level Security
- Users can only access their own feedback
- Admins have full access for moderation
- Prevents unauthorized data access

### Data Validation
- Feedback types are constrained by database CHECK constraints
- Suggested answers are validated (A-F only)
- All inputs are sanitized and validated

### Privacy
- User information is handled according to existing privacy policies
- Feedback is linked to user accounts for accountability
- Session information is optional and can be null

## Performance Considerations

### Database Indexes
- Optimized indexes for common query patterns
- Composite indexes for filtered searches
- Efficient pagination support

### Component Performance
- Lazy loading of feedback data
- Debounced search inputs
- Optimized re-renders

### Caching
- Feedback statistics can be cached
- Question-specific feedback can be cached
- User feedback history can be cached

## Analytics and Insights

### Metrics to Track
- Feedback submission rates
- Most common feedback types
- Questions with most feedback
- User engagement with feedback feature

### Quality Improvement
- Identify frequently reported questions
- Track answer correction suggestions
- Monitor feedback resolution rates
- Measure question quality improvements

## Future Enhancements

### Potential Improvements
- Email notifications for administrators
- Feedback status tracking (pending, reviewed, resolved)
- Bulk feedback operations
- Integration with question editing workflow
- Feedback voting/validation system
- Anonymous feedback option

### Analytics Dashboard
- Feedback trends over time
- Question quality metrics
- User engagement analytics
- Automated quality alerts

## Troubleshooting

### Common Issues

1. **Feedback not submitting**
   - Check user authentication
   - Verify database permissions
   - Check network connectivity

2. **Admin can't see feedback**
   - Verify admin role in profiles table
   - Check RLS policies
   - Confirm proper authentication

3. **Performance issues**
   - Check database indexes
   - Monitor query performance
   - Consider pagination for large datasets

### Debug Mode

Enable debug logging by adding console statements:

```typescript
// In feedback submission
console.log('Submitting feedback:', feedbackData)
```

## API Reference

### Supabase Operations

#### Insert Feedback
```typescript
const { error } = await supabase
  .from('question_feedbacks')
  .insert([feedbackData])
```

#### Query Feedback (Admin)
```typescript
const { data, error } = await supabase
  .from('question_feedbacks')
  .select(`
    *,
    profiles!user_id (email, full_name),
    questions!question_id (question_text),
    user_sessions!session_id (session_name)
  `)
  .order('created_at', { ascending: false })
```

#### Get User Feedback
```typescript
const { data, error } = await supabase
  .from('question_feedbacks')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

This comprehensive feedback system provides a robust foundation for improving question quality and user experience through structured user input and administrative oversight.