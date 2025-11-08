import { IsOptional, IsString, IsIn } from 'class-validator';
import { TaskSubmissionStatus } from '../../enums/task-submission-status.enum';

export class FilterTaskSubmissionDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsString()
  status?: TaskSubmissionStatus;

  @IsOptional()
  @IsIn(['createdAt', 'gradedAt', 'score'])
  orderBy?: 'createdAt' | 'gradedAt' | 'score';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
