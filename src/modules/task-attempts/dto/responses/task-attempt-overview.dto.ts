export class TaskAttemptOverviewResponseDto {
  id: string;
  title: string;
  image: string;
  status: string;
  classSlug?: string;
  taskSlug?: string;
  lastAccessedTime: string;
  completedTime?: string;
}
