import { IsNotEmpty, IsOptional } from 'class-validator';

export class ShareTaskIntoClassesDto {
  @IsNotEmpty()
  taskId: string;

  @IsNotEmpty()
  classIds: string[];

  @IsOptional()
  startTime?: Date;

  @IsOptional()
  endTime?: Date;
}
