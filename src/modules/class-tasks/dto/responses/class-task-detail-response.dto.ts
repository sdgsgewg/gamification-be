import { CurrentAttemptResponseDto } from 'src/modules/task-attempts/dto/responses/current-attempt-response.dto';
import { RecentAttemptResponseDto } from 'src/modules/task-attempts/dto/responses/recent-attempt-response.dto';

export class TaskDetail {
  title: string;
  subtitle: string;
  slug: string;
  description?: string;
  image?: string;
  subject: { id: string; name: string };
  material?: { id: string; name: string };
  grade: string;
  questionCount: number;
  difficulty: string;
  createdBy: string;
  type: TaskType;
}

export class TaskType {
  id: string;
  name: string;
  isRepeatable: boolean;
}

export class TaskDuration {
  startTime?: Date;
  endTime?: Date;
  duration?: string;
}

export class ClassTaskDetailResponseDto {
  id: string;
  taskDetail: TaskDetail;
  duration?: TaskDuration;
  currAttempt?: CurrentAttemptResponseDto;
  recentAttempts?: RecentAttemptResponseDto[];
}
