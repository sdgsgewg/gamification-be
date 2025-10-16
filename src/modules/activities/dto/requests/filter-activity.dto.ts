import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class FilterActivityDto {
  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsOptional()
  @IsString()
  taskTypeId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  gradeIds?: string[];

  @IsOptional()
  @IsString()
  userId?: string; // tambahan untuk kategori 'continue' & 'recommended'
}
