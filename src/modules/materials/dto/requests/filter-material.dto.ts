import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class FilterMaterialDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  gradeIds: string[];

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name'])
  orderBy?: 'createdAt' | 'updatedAt' | 'name';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
