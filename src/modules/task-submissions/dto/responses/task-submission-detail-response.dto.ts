import { QuestionResponseDto } from "src/modules/task-questions/dto/responses/question-response.dto";

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

export class SubmissionSummary {
  pointGained: number;
  totalPoints: number;
  score: number;
  xpGained: number;
  feedback: string;
}

export class SubmissionProgress {
  reviewedQuestionCount: number;
  totalQuestionCount: number;
  startGradedAt: string;
  lastGradedAt?: string;
  finishGradedAt?: string;
  duration?: string;
  status: string;
}

export class TaskSubmissionDetailResponseDto {
  id: string;
  studentName: string;
  className: string;
  taskDetail: TaskDetail;
  summary: SubmissionSummary;
  progress: SubmissionProgress;
  questions?: QuestionResponseDto[];
}
