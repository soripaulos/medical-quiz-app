export interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  difficulty: number
  specialty: string
  explanation: string
  explanation_image_url?: string
  sources?: string
  year?: number
  exam_type?: {
    id: string
    name: string
  }
  created_at: string
  updated_at: string
}

export interface AnswerChoice {
  letter: string
  text: string
  is_correct: boolean
}

export interface UserSession {
  id: string
  session_name: string
  session_type: "practice" | "exam"
  is_active: boolean
  is_paused: boolean
  track_progress: boolean
  total_questions: number
  current_question_index: number
  time_limit?: number
  time_remaining?: number
  created_at: string
  completed_at: string | null
  user_id: string
  total_time_spent?: number
  correct_answers?: number
  incorrect_answers?: number
  unanswered_questions?: number
}

export interface UserAnswer {
  question_id: string
  user_answer: string | null
  is_correct: boolean
  time_spent: number
}

export interface UserQuestionProgress {
  id: string
  question_id: string
  times_attempted: number
  times_correct: number
  is_flagged: boolean
  last_attempted?: string
  user_id: string
  created_at: string
  updated_at: string
  status: "correct" | "incorrect" | "unanswered"
}

export interface UserNote {
  id: string
  question_id: string
  note_text: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface LabValue {
  id: string
  category: string
  test_name: string
  reference_range: string
  units?: string
}

export interface QuestionFilters {
  specialties: string[]
  years: number[]
  difficulties: number[]
  examTypes: string[]
  questionStatus: ("answered" | "unanswered" | "correct" | "incorrect" | "flagged")[]
}

// Helper function to convert Question to AnswerChoice array
export function getAnswerChoices(question: Question): AnswerChoice[] {
  const choices: AnswerChoice[] = []

  question.options.forEach((option, index) => {
    const letter = String.fromCharCode(65 + index) // Convert index to A, B, C, etc.
    choices.push({
      letter: letter,
      text: option,
      is_correct: question.correctAnswer === letter,
    })
  })

  return choices
}
