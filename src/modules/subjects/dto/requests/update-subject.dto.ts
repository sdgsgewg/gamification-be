import { IsOptional, ValidateIf } from 'class-validator';

export class UpdateSubjectDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  updatedBy?: string;

  @ValidateIf(() => false) // skip validator juga
  imageFile?: any;
}
