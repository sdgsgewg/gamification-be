import { StudentTaskAttemptAnalyticsDto } from 'src/modules/task-attempts/dto/responses/attempt-analytics/student-task-attempt-analytics-response.dto';

export class ClassTaskAttemptAnalyticsResponseDto {
  className: string;
  taskTitle: string;
  taskSlug: string;

  averageScoreAllStudents: number;
  averageAttempts: number;

  students: StudentTaskAttemptAnalyticsDto[];
}
