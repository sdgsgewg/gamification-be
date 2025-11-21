export class ClassResponse {
  id: string;
  name: string;
  slug: string;
}

export class ClassTaskOverviewResponseDto {
  id: string;
  title: string;
  image: string;
  status: string;
  class: ClassResponse;
  taskSlug: string;
  deadline: string;
  lastAccessedTime?: string;
  submittedTime?: string;
  completedTime?: string;
}
