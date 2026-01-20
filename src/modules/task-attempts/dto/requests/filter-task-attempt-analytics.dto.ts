import { IsOptional, IsString } from 'class-validator';
import { TaskAttemptScope } from '../../enums/task-attempt-scope.enum';

export class FilterTaskAttemptAnalyticsDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  scope?: TaskAttemptScope;
}
