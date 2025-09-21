export class SubjectDetailResponseDto {
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  createdBy: string;
  updatedBy?: string;
}
