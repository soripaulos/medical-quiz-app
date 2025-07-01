export interface Question {
  id: string
  question_text: string
  question_image_url?: string
  explanation: string
  explanation_image_url?: string
  sources?: string
  year?: number
  difficulty?: number
  specialty?: {
    id: string
    name: string
  }
  exam_type?: {
    id: string
    name: string
  }
  choice_a?: string
  choice_b?: string
  choice_c?: string
  choice_d?: string
  choice_e?: string
  choice_f?: string
  correct_answer?: string
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
  completed_at?: string
  user_id: string
  total_time_spent?: number
  correct_answers?: number
  incorrect_answers?: number
  unanswered_questions?: number
}

export interface UserAnswer {
  id: string
  question_id: string
  selected_choice_letter: string
  is_correct: boolean
  answered_at: string
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

  if (question.choice_a) {
    choices.push({
      letter: "A",
      text: question.choice_a,
      is_correct: question.correct_answer === "A",
    })
  }

  if (question.choice_b) {
    choices.push({
      letter: "B",
      text: question.choice_b,
      is_correct: question.correct_answer === "B",
    })
  }

  if (question.choice_c) {
    choices.push({
      letter: "C",
      text: question.choice_c,
      is_correct: question.correct_answer === "C",
    })
  }

  if (question.choice_d) {
    choices.push({
      letter: "D",
      text: question.choice_d,
      is_correct: question.correct_answer === "D",
    })
  }

  if (question.choice_e) {
    choices.push({
      letter: "E",
      text: question.choice_e,
      is_correct: question.correct_answer === "E",
    })
  }

  if (question.choice_f) {
    choices.push({
      letter: "F",
      text: question.choice_f,
      is_correct: question.correct_answer === "F",
    })
  }

  return choices
}
