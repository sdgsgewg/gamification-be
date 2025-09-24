import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class FilterTaskDto {
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
  @IsArray()
  taskGradeIds?: string[];

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name'])
  orderBy?: 'createdAt' | 'updatedAt' | 'name';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
