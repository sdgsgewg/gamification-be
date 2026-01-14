import { CurrentAttemptResponseDto } from './current-attempt-response.dto';
import { RecentAttemptResponseDto } from './recent-attempt-response.dto';

export class AttemptMetaResponseDto {
  current: CurrentAttemptResponseDto;
  recent: RecentAttemptResponseDto[];
}
