import { IsNotEmpty, IsOptional } from 'class-validator';
import { ActivityLogEventType } from '../../enums/activity-log-event-type';

export class CreateActivityLogDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  eventType: ActivityLogEventType;

  @IsOptional()
  description?: string;

  @IsOptional()
  metadata?: any;
}
