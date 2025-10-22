export class ActivityOverviewResponseDto {
  id: string;
  title: string;
  slug: string;
  image?: string;
  type: string;
  subject: string;
  grade: string;
  questionCount: number;
  answeredCount?: number;
}
