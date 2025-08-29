import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSubjectDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  image?: string;

  @IsNotEmpty()
  createdBy: string;
}
