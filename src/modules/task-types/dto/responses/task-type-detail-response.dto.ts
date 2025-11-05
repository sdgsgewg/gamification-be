export class TaskTypeDetailResponseDto {
  taskTypeId: string;
  name: string;
  slug: string;
  description?: string;
  scope: string;
  hasDeadline: boolean;
  isRepeatable: boolean;
  createdBy: string;
  updatedBy?: string;
}
