import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class CreateMaterialDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  subjectId: string;

  @IsNotEmpty()
  gradeIds: string[];

  @IsNotEmpty()
  createdBy: string;

  @IsOptional()
  description?: string;

  @ValidateIf(() => false) // skip validator juga
  imageFile?: any;
}
