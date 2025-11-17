import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';

export class StudentClassTaskResponseDto {
  title: string;
  slug: string;
  image?: string;
  type: string;
  subject: string;
  questionCount: number;
  answeredCount: number;
  deadline?: string;
  status: TaskAttemptStatus;
}
