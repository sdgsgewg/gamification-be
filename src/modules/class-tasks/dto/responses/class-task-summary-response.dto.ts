import { QuestionResponseDto } from 'src/modules/task-questions/dto/responses/question-response.dto';

export class ClassTaskStats {
  pointGained: number;
  totalPoints: number;
  score: number;
  xpGained: number;
}

export class ClassTaskAttemptProgress {
  startedAt: string;
  completedAt: string;
  submittedAt: string;
  duration: string;
  status: string;
}

export class ClassTaskGradingProgress {
  startGradedAt: string;
  lastGradedAt: string;
  finishGradedAt: string;
  duration: string;
  status: string;
}

export class ClassTaskSummaryResponseDto {
  title: string;
  image: string;
  description: string;
  teacherName: string;
  className: string;
  stats: ClassTaskStats;
  attemptProgress: ClassTaskAttemptProgress;
  gradingProgress?: ClassTaskGradingProgress | null;
  questions: QuestionResponseDto[];
}
