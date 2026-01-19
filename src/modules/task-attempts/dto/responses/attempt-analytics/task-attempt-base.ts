export abstract class BaseTaskAttempt {
  task: {
    title: string;
    slug: string;
    isRepeatable: boolean;
  };

  studentsAttempted: number;
  studentsCompleted: number;

  avgScoreLatestAttempt: number;
  avgScoreAllAttempts: number;
  avgAttemptsPerStudent: number;
}
