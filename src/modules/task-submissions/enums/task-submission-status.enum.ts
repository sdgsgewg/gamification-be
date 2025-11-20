export enum TaskSubmissionStatus {
  NOT_STARTED = 'NOT_STARTED',
  ON_PROGRESS = 'ON_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const TaskSubmissionStatusLabels: Record<TaskSubmissionStatus, string> =
  {
    [TaskSubmissionStatus.NOT_STARTED]: 'Not Started',
    [TaskSubmissionStatus.ON_PROGRESS]: 'On Progress',
    [TaskSubmissionStatus.COMPLETED]: 'Completed',
    [TaskSubmissionStatus.CANCELLED]: 'Cancelled',
  };
