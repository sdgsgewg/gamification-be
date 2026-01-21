export class StudentTaskAttemptAnalyticsResponseDto {
  task: {
    title: string;
    slug: string;
    isRepeatable: boolean;
  };

  completedAttemptCount: number;
  totalAttemptCount: number;

  // CLASS SCOPE ONLY DATA
  class?: {
    name: string;
    slug: string;
  };

  deadline?: string;
}
