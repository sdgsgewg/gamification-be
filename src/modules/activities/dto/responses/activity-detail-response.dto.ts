import { CurrentAttemptResponseDto } from 'src/modules/task-attempts/dto/responses/current-attempt-response.dto';
import { RecentAttemptResponseDto } from 'src/modules/task-attempts/dto/responses/recent-attempt-response.dto';

export class TaskDetail {
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
}

export class ActivityType {
  id: string;
  name: string;
  isRepeatable: boolean;
}

export class ActivityDuration {
  startTime?: Date;
  endTime?: Date;
  duration?: string;
}

export class ActivityDetailResponseDto {
  id: string;
  taskDetail: TaskDetail;
  duration?: ActivityDuration;
  currAttempt?: CurrentAttemptResponseDto;
  recentAttempts?: RecentAttemptResponseDto[];
}
