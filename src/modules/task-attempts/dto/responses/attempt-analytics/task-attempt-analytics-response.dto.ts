export class TaskAttemptAnalyticsResponseDto {
  task: {
    title: string;
    slug: string;
    isRepeatable: boolean;
  };

  totalAttempts: number;
  studentsAttempted: number;
  studentsCompleted: number;

  // CLASS SCOPE ONLY DATA
  class?: {
    name: string;
    slug: string;
  };

  totalStudents?: number;

  deadline?: string;
}
