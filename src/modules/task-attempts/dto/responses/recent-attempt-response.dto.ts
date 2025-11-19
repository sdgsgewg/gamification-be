import { TaskAttemptStatus } from '../../enums/task-attempt-status.enum';

export class RecentAttemptResponseDto {
  id: string;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  duration?: string;
  status?: TaskAttemptStatus;
}
