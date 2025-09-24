export class TaskTypeOverviewResponseDto {
  taskTypeId: string;
  name: string;
  slug: string;
  scope: string;
  hasDeadline: boolean;
  isCompetitive: boolean;
  isRepeatable: boolean;
  pointMultiplier: number;
}
