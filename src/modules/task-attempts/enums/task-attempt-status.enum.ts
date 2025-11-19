export enum TaskAttemptStatus {
  NOT_STARTED = 'NOT_STARTED',
  ON_PROGRESS = 'ON_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  PAST_DUE = 'PAST_DUE',
}

export const TaskAttemptStatusLabels: Record<TaskAttemptStatus, string> = {
  [TaskAttemptStatus.NOT_STARTED]: 'Not Started',
  [TaskAttemptStatus.ON_PROGRESS]: 'On Progress',
  [TaskAttemptStatus.SUBMITTED]: 'Submitted',
  [TaskAttemptStatus.COMPLETED]: 'Completed',
  [TaskAttemptStatus.PAST_DUE]: 'Past Due',
};
