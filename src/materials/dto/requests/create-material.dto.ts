import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMaterialDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  subjectId: string;

  @IsOptional()
  description?: string;

  @IsNotEmpty()
  gradeIds?: string[];

  @IsOptional()
  image?: string;

  @IsNotEmpty()
  createdBy: string;
}
