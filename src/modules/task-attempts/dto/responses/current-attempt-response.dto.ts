import { TaskAttemptStatus } from '../../enums/task-attempt-status.enum';

export class CurrentAttemptResponseDto {
  answeredCount?: number;
  startedAt?: string;
  lastAccessedAt?: string;
  status?: TaskAttemptStatus;
}
