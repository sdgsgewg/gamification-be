import { IsOptional, IsString, IsIn, IsDate } from 'class-validator';
import { ActivityAttemptStatus } from 'src/modules/activities/enums/activity-attempt-status.enum';

export class FilterTaskAttemptDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsString()
  status?: ActivityAttemptStatus;

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
