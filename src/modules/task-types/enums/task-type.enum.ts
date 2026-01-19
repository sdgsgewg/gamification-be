export enum TaskType {
  SELF_PRACTICE = 'Self Practice',
  TRYOUT = 'Tryout',
  ASSIGNMENT = 'Assignment',
  QUIZ = 'Quiz',
}

export const TaskTypeLabels: Record<TaskType, string> = {
  [TaskType.SELF_PRACTICE]: 'Self Practice',
  [TaskType.TRYOUT]: 'Tryout',
  [TaskType.ASSIGNMENT]: 'Assignment',
  [TaskType.QUIZ]: 'Quiz',
};
