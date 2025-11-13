export class TaskDetail {
  title: string;
  slug: string;
  description?: string;
  image?: string;
  subject: string;
  material?: string;
  grade: string;
  questionCount: number;
  difficulty: string;
  type: string;
}

export class SubmissionProgress {
  reviewedQuestionCount: number;
  totalQuestionCount: number;
  startGradedAt: string;
  lastGradedAt?: string;
  finishGradedAt?: string;
  status: string;
}

export class SubmissionSummary {
  score: number;
  feedback: string;
  pointGained: number;
  totalPoints: number;
  xpGained: number;
}

export class AnswerLog {
  answerLogId: string | null;
  text: string | null;
  image: string | null;
  optionId: string | null;
  isCorrect: boolean | null;
}

export class QuestionOption {
  optionId: string;
  text: string;
  isCorrect: boolean;
  isSelected: boolean;
}

export class Question {
  questionId: string;
  text: string;
  point: number;
  type: string;
  timeLimit?: number;
  image?: string;
  options?: QuestionOption[];
  userAnswer?: AnswerLog;
}

export class TaskSubmissionDetailResponseDto {
  id: string;
  studentName: string;
  className: string;
  taskDetail: TaskDetail;
  progress: SubmissionProgress;
  summary: SubmissionSummary;
  questions?: Question[];
}
