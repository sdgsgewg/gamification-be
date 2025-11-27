import { IsOptional, IsString, IsIn } from 'class-validator';
import { LeaderboardScope } from '../enums/leaderboard-scope.enum';

export class FilterStudentLeaderboardDto {
  @IsOptional()
  @IsString()
  @IsIn(Object.values(LeaderboardScope))
  scope?: LeaderboardScope;
}
