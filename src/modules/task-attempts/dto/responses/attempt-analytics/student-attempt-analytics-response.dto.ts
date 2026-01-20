import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';
import { StudentAttemptDetailDto } from './student-attempt-detail-response.dto';

export class StudentAttemptAnalyticsDto {
  studentId: string;
  studentName: string;

  totalAttempts: number;
  firstAttemptScore?: number;
  lastAttemptScore?: number;
  averageScore?: number;
  improvement?: number;

  latestStatus: TaskAttemptStatus;
  latestSubmissionId?: string;

  attempts: StudentAttemptDetailDto[];
}
