import { QuestionResponseDto } from 'src/modules/task-questions/dto/responses/question-response.dto';

export class ActivityStats {
  pointGained: number;
  totalPoints: number;
  score: number;
  xpGained: number;
}

export class ActivityProgress {
  startedAt: string;
  completedAt: string;
  duration: string;
  status: string;
}

export class ActivitySummaryResponseDto {
  title: string;
  image: string;
  description: string;
  createdBy: string;
  stats: ActivityStats;
  progress: ActivityProgress;
  questions: QuestionResponseDto[];
}
