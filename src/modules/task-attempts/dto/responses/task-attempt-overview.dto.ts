export class TaskAttemptOverviewResponseDto {
  id: string;
  title: string;
  image: string;
  status: string;
  classSlug?: string;
  taskSlug?: string;
  deadline: string;
  lastAccessedTime: string;
  submittedTime?: string;
  completedTime?: string;
}
