import { TaskAttemptStatus } from '../../enums/task-attempt-status.enum';

export class TaskType {
  name: string;
  isRepeatable: boolean;
}

export class Attempt {
  answeredCount?: number;
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

export class TaskAttemptProgress {
  startedAt: string;
  lastAccessedAt: string;
  completedAt: string;
  status: TaskAttemptStatus;
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

export class TaskAttemptDetailResponseDto {
  title: string;
  slug: string;
  image: string;
  description: string;
  subject: string;
  material: string;
  grade: string;
  questionCount: number;
  difficulty: string;
  createdBy: string;
  type: TaskType;
  attempt?: Attempt;
  stats: TaskAttemptStats;
  duration?: TaskDuration;
  progress: TaskAttemptProgress;
  questions: Question[];
}
