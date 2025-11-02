import { ActivityAttemptStatus } from '../../enums/activity-attempt-status.enum';

export class ActivityAttempt {
  answeredCount?: number;
  startedAt?: string | null;
  lastAccessedAt?: string | null;
  status?: ActivityAttemptStatus;
}

export class ActivityDetailResponseDto {
  id: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  subject: { subjectId: string; name: string };
  material?: { materialId: string; name: string };
  type: { taskTypeId: string; name: string };
  grade: string;
  questionCount: number;
  startTime?: Date;
  endTime?: Date;
  duration?: string;
  createdBy: string;
  attempt?: ActivityAttempt;
}
