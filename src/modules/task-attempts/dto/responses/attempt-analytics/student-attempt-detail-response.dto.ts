import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';

export class StudentAttemptDetailDto {
  attemptNumber: number;
  attemptId: string;

  class?: {
    name: string;
    slug: string;
  };

  task: {
    slug: string;
  };

  scope: string;
  score: number;
  status: TaskAttemptStatus;
  completedAt?: Date;
}
