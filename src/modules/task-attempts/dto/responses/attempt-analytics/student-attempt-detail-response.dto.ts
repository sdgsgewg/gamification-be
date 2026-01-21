import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';

export class StudentAttemptDetailDto {
  attemptNumber: number;
  attemptId: string;
  classSlug: string;
  taskSlug: string;
  score: number;
  status: TaskAttemptStatus;
  completedAt?: Date;
}
