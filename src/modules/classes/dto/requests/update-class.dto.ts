import { IsOptional, ValidateIf } from 'class-validator';

export class UpdateClassDto {
  @IsOptional()
  name: string;

  @IsOptional()
  gradeIds: string[];

  @IsOptional()
  updatedBy: string;

  @IsOptional()
  description?: string;

  @ValidateIf(() => false) // skip validator juga
  imageFile?: any;
}
