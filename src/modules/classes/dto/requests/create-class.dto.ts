import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class CreateClassDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  gradeIds: string[];

  @IsNotEmpty()
  createdBy: string;

  @IsNotEmpty()
  teacherId: string;

  @IsOptional()
  description?: string;

  @ValidateIf(() => false) // skip validator juga
  imageFile?: any;
}
