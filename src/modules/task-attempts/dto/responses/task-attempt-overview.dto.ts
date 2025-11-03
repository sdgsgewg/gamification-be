export class TaskAttemptOverviewResponseDto {
  id: string;
  title: string;
  image: string;
  status: string;
  lastAccessedTime: string;
  completedTime?: string;
}
