export enum TaskDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export const TaskDifficultyLabels: Record<TaskDifficulty, string> = {
  [TaskDifficulty.EASY]: 'Easy',
  [TaskDifficulty.MEDIUM]: 'Medium',
  [TaskDifficulty.HARD]: 'Hard',
};
