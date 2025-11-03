import { TaskAttemptOverviewResponseDto } from './task-attempt-overview.dto';

export class GroupedTaskAttemptResponseDto {
  dateLabel: string;
  dayLabel: string;
  attempts: TaskAttemptOverviewResponseDto[];
}
