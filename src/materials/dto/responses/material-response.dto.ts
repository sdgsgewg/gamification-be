export class MaterialResponseDto {
  materialId: string;
  name: string;
  slug: string;
  description: string;
  image?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  subject?: { subjectId: string; name: string };
  gradeIds?: string[];
  grade: string;
}
