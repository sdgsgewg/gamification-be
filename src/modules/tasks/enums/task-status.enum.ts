export enum TaskStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.DRAFT]: 'Draft',
  [TaskStatus.FINALIZED]: 'Finalized',
  [TaskStatus.PUBLISHED]: 'Published',
  [TaskStatus.ARCHIVED]: 'Archived',
};
