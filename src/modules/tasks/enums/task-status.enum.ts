export enum TaskStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  FINALIZED = 'FINALIZED',
}

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.DRAFT]: 'Draft',
  [TaskStatus.PUBLISHED]: 'Published',
  [TaskStatus.FINALIZED]: 'Finalized',
};
