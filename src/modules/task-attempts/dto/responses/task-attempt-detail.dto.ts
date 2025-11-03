import { ActivityAttemptStatus } from 'src/modules/activities/enums/activity-attempt-status.enum';

export class TaskAttemptStats {
  pointGained: number;
  totalPoints: number;
  xpGained: number;
  score: number;
}

export class TaskAttemptProgress {
  startedAt: string;
  lastAccessedAt: string;
  completedAt: string;
  status: ActivityAttemptStatus;
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
  image: string;
  description: string;
  subject: string;
  material: string;
  type: string;
  grade: string;
  questionCount: number;
  startTime?: Date;
  endTime?: Date;
  duration?: string;
  createdBy: string;
  stats: TaskAttemptStats;
  progress: TaskAttemptProgress;
  questions: Question[];
}
