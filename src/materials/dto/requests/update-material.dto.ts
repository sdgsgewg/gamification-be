import { IsOptional } from 'class-validator';

export class UpdateMaterialDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  subjectId?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  gradeIds?: string[];

  @IsOptional()
  image?: string;

  @IsOptional()
  updatedBy?: string;
}
