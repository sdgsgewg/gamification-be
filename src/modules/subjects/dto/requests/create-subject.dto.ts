import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class CreateSubjectDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  createdBy: string;

  @IsOptional()
  description?: string;

  @ValidateIf(() => false) // skip validator juga
  imageFile?: any;
}
