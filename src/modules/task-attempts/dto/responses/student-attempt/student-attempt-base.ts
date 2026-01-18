import { StudentTaskAttemptAnalyticsDto } from './student-task-attempt-analytics-response.dto';

export abstract class BaseStudentAttempt {
  task: {
    title: string;
    slug: string;
  };

  averageScoreAllStudents: number;
  averageAttempts: number;

  students: StudentTaskAttemptAnalyticsDto[];
}
