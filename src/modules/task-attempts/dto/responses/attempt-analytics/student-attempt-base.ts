import { StudentTaskAttemptAnalyticsDto } from './student-task-attempt-analytics-response.dto';
import { TaskAttemptAnalyticsDto } from './task-attempt-analytics-response.dto';

export abstract class BaseStudentAttempt {
  task: {
    title: string;
    slug: string;
  };

  averageScoreAllStudents: number;
  averageAttempts: number;

  attempts: TaskAttemptAnalyticsDto[];

  students: StudentTaskAttemptAnalyticsDto[];
}
