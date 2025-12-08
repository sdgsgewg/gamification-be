export class ClassResponseDto {
  name: string;
  slug: string;
}

export class TaskAttemptOverviewResponseDto {
  id: string;
  title: string;
  image: string;
  status: string;
  class?: ClassResponseDto;
  taskSlug?: string;
  deadline: string;
  lastAccessedTime?: string;
  submittedTime?: string;
  completedTime?: string;
}
