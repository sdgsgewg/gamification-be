import { IsOptional, IsString, IsIn, IsDate, IsBoolean } from 'class-validator';
import { TaskAttemptStatus } from '../../enums/task-attempt-status.enum';
import { Transform } from 'class-transformer';

export class FilterTaskAttemptDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsString()
  status?: TaskAttemptStatus;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isClassTask?: boolean;

  @IsOptional()
  @IsDate()
  dateFrom?: Date;

  @IsOptional()
  @IsDate()
  dateTo?: Date;

  @IsOptional()
  @IsIn(['startedAt', 'lastAccesedAt', 'completedAt', 'name'])
  orderBy?: 'startedAt' | 'lastAccesedAt' | 'completedAt' | 'name';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
