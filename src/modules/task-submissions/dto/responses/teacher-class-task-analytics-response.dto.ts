export class TeacherClassTaskAnalyticsDto {
  className: string;
  classSlug: string;

  taskTitle: string;
  taskSlug: string;
  isRepeatable: boolean;

  totalStudents: number;
  studentsAttempted: number;
  studentsCompleted: number;

  avgScoreLatestAttempt: number;
  avgScoreAllAttempts: number;
  avgAttemptsPerStudent: number;

  deadline?: string;
}
