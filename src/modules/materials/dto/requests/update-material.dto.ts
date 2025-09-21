import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class UpdateMaterialDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  subjectId?: string;

  @IsOptional()
  gradeIds?: string[];

  @IsNotEmpty()
  updatedBy: string;

  @IsOptional()
  description?: string;

  @ValidateIf(() => false) // skip validator juga
  imageFile?: any;
}
