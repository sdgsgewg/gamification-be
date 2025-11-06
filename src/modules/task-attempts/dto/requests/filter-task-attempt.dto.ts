import { IsOptional, IsString, IsIn, IsDate } from 'class-validator';
import { TaskAttemptStatus } from '../../enums/task-attempt-status.enum';

export class FilterTaskAttemptDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsString()
  status?: TaskAttemptStatus;

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
