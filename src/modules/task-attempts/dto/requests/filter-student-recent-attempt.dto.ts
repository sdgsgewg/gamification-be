import { IsOptional, IsString } from 'class-validator';

export class FilterStudentRecentAttemptDto {
  @IsOptional()
  @IsString()
  classSlug?: string;

  @IsOptional()
  @IsString()
  taskSlug?: string;
}
