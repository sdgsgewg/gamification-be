import { IsOptional, IsString, IsIn } from 'class-validator';
import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';

export class FilterClassTaskDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsString()
  status?: TaskAttemptStatus;

  @IsOptional()
  @IsIn(['startedAt', 'lastAccesedAt', 'completedAt', 'name'])
  orderBy?: 'startedAt' | 'lastAccesedAt' | 'completedAt' | 'name';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
