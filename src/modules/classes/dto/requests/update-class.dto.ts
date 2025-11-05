import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class UpdateClassDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  updatedBy: string;

  @IsOptional()
  description?: string;

  @ValidateIf(() => false) // skip validator juga
  imageFile?: any;
}
