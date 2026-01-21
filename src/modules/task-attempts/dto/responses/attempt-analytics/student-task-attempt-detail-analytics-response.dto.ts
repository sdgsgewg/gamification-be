import { TaskAttemptStatus } from "src/modules/task-attempts/enums/task-attempt-status.enum";
import { StudentAttemptDetailDto } from "./student-attempt-detail-response.dto";

export class StudentTaskAttemptDetailAnalyticsResponseDto {
  studentId: string;
  studentName: string;

  task: {
    title: string;
    slug: string;
    totalQuestion: number;
    maxPoint: number;
  };

  // summary
  totalAttempts: number;
  firstAttemptScore?: number;
  lastAttemptScore?: number;
  averageScore?: number;
  improvement?: number;

  latestStatus: TaskAttemptStatus;
  latestSubmissionId?: string;

  // class only
  class?: {
    name: string;
    slug: string;
    deadline?: Date;
  };

  attempts: StudentAttemptDetailDto[];
}
