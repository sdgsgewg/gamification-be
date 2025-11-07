import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';

export class TaskType {
  id: string;
  name: string;
  isRepeatable: boolean;
}

export class CurrentAttempt {
  answeredCount?: number;
  startedAt?: string;
  lastAccessedAt?: string;
  status?: TaskAttemptStatus;
}

export class RecentAttempt {
  startedAt?: string;
  lastAccessedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  status?: TaskAttemptStatus;
}

export class TaskAttemptStats {
  pointGained: number;
  totalPoints: number;
  xpGained: number;
  score: number;
}

export class TaskDuration {
  startTime?: Date;
  endTime?: Date;
  duration?: string;
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

export class TaskSubmission {
  score: number;
  feedback: string;
  status: string;
  gradedBy: string;
  gradedAt: string;
}

export class ClassTaskDetailResponseDto {
  id: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  subject: { id: string; name: string };
  material?: { id: string; name: string };
  grade: string;
  questionCount: number;
  difficulty: string;
  createdBy: string;
  type: TaskType;
  currAttempt?: CurrentAttempt;
  recentAttempt?: RecentAttempt;
  stats?: TaskAttemptStats;
  duration?: TaskDuration;
  questions?: Question[];
  submission?: TaskSubmission;
}
