import { CurrentAttemptResponseDto } from 'src/modules/task-attempts/dto/responses/current-attempt-response.dto';
import { RecentAttemptResponseDto } from 'src/modules/task-attempts/dto/responses/recent-attempt-response.dto';
import { BaseTaskType } from 'src/modules/task-types/dto/responses/task-type-base';
import { BaseTaskDetail } from 'src/modules/tasks/dto/responses/task-detail-base';
import { TaskDuration } from 'src/modules/tasks/dto/responses/task-duration.dto';

export interface ActivityTaskDetail extends BaseTaskDetail {
  type: BaseTaskType & {
    isRepeatable: boolean;
  };
}

export class ActivityDetailResponseDto {
  id: string;
  taskDetail: ActivityTaskDetail;
  duration?: TaskDuration;
  currAttempt?: CurrentAttemptResponseDto;
  recentAttempts?: RecentAttemptResponseDto[];
}
