import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { TaskStatus } from '../../enums/task-status.enum';

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
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  gradeIds?: string[];

  @IsOptional()
  @IsString()
  status?: TaskStatus;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'title'])
  orderBy?: 'createdAt' | 'updatedAt' | 'title';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
