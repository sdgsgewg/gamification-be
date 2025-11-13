export class TaskSubmissionOverviewResponseDto {
  id: string;
  title: string;
  image: string;
  className: string;
  studentName: string;
  status: string;
  submittedTime: string;
  gradedTime?: string;
}
