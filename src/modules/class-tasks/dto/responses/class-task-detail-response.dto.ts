import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';

export class TaskType {
  id: string;
  name: string;
  isRepeatable: boolean;
}

export class CurrentAttempt {
  answeredCount?: number;
  startedAt?: string;
  lastAccessedAt?: string;
  status?: TaskAttemptStatus;
}

export class RecentAttempt {
  startedAt?: string;
  lastAccessedAt?: string;
  completedAt?: string;
  status?: TaskAttemptStatus;
}

export class TaskDuration {
  startTime?: Date;
  endTime?: Date;
  duration?: string;
}

export class ClassTaskDetailResponseDto {
  id: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  subject: { id: string; name: string };
  material?: { id: string; name: string };
  grade: string;
  questionCount: number;
  createdBy: string;
  type: TaskType;
  currAttempt?: CurrentAttempt;
  recentAttempt?: RecentAttempt;
  duration?: TaskDuration;
}
