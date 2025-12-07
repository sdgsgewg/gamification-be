export class TaskTypeOverviewResponseDto {
  taskTypeId: string;
  name: string;
  slug: string;
  description: string;
  scope: string;
  hasDeadline: boolean;
  isRepeatable: boolean;
}
