import { IsOptional, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  username?: string;

  @IsOptional()
  gender?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  dob?: Date;

  @IsOptional()
  gradeId?: string;

  @ValidateIf(() => false) // skip validator juga
  imageFile?: any;
}
