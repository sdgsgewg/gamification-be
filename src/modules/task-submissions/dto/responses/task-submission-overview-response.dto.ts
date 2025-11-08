export class TaskSubmissionOverviewResponseDto {
  id: string;
  title: string;
  image: string;
  studentName: string;
  status: string;
  submittedTime: string;
  gradedTime?: string;
}
