import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';

export class StudentAttemptDetailDto {
  attemptNumber: number;
  attemptId: string;
  score: number;
  status: TaskAttemptStatus;
  completedAt?: Date;
}

export class StudentTaskAttemptAnalyticsDto {
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

export class ClassTaskAttemptAnalyticsResponseDto {
  className: string;
  taskTitle: string;
  taskSlug: string;

  averageScoreAllStudents: number;
  averageAttempts: number;

  students: StudentTaskAttemptAnalyticsDto[];
}
