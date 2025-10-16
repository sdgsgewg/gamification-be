export class ActivityDetailResponseDto {
  id: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  subject: { subjectId: string; name: string };
  material?: { materialId: string; name: string };
  type: { taskTypeId: string; name: string };
  grade: string;
  questionCount: number;
  answeredCount?: number;
  startTime?: Date;
  endTime?: Date;
  duration?: string;
  createdBy: string;
  lastAccessedTime?: string;
  completedTime?: string;
  status?: string;
}
