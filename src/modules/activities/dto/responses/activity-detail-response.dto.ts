import { ActivityAttemptStatus } from '../../enums/activity-attempt-status.enum';

export class ActivityType {
  id: string;
  name: string;
  isRepeatable: boolean;
}

export class CurrentAttempt {
  answeredCount?: number;
  startedAt?: string;
  lastAccessedAt?: string;
  status?: ActivityAttemptStatus;
}

export class RecentAttempt {
  startedAt?: string;
  lastAccessedAt?: string;
  completedAt?: string;
  status?: ActivityAttemptStatus;
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
  createdBy: string;
  type: ActivityType;
  currAttempt?: CurrentAttempt;
  recentAttempt?: RecentAttempt;
  duration?: ActivityDuration;
}
