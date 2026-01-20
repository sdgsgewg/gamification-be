export class TaskAttemptAnalyticsResponseDto {
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

  // CLASS SCOPE ONLY DATA
  class?: {
    name: string;
    slug: string;
  };

  totalStudents?: number;

  deadline?: string;
}
