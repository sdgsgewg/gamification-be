import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class FilterClassDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  gradeIds?: string[];

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name'])
  orderBy?: 'createdAt' | 'updatedAt' | 'name';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
