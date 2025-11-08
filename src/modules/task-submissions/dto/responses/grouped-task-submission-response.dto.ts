import { TaskSubmissionOverviewResponseDto } from './task-submission-overview-response.dto';

export class GroupedTaskSubmissionResponseDto {
  dateLabel: string;
  dayLabel: string;
  submissions: TaskSubmissionOverviewResponseDto[];
}
