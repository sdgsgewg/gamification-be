import { IsNotEmpty, IsOptional } from 'class-validator';

export class CompleteProfileDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  username: string;

  @IsOptional()
  gradeId?: string; // hanya jika siswa
}
