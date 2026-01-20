import { AttemptAnalyticsDto } from './attempt-analytics-response.dto';
import { StudentAttemptAnalyticsDto } from './student-attempt-analytics-response.dto';

export class TaskAttemptDetailAnalyticsResponseDto {
  task: {
    title: string;
    slug: string;
  };

  averageScoreAllStudents: number;
  averageAttempts: number;

  attempts: AttemptAnalyticsDto[];

  students: StudentAttemptAnalyticsDto[];

  // CLASS SCOPE ONLY DATA
  class?: {
    name: string;
  };
}
