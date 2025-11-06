import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';

export class ActivityType {
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

export class ActivityDuration {
  startTime?: Date;
  endTime?: Date;
  duration?: string;
}

export class ActivityDetailResponseDto {
  id: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  subject: { id: string; name: string };
  material?: { id: string; name: string };
  grade: string;
  questionCount: number;
  difficulty: string;
  createdBy: string;
  type: ActivityType;
  currAttempt?: CurrentAttempt;
  recentAttempt?: RecentAttempt;
  duration?: ActivityDuration;
}
