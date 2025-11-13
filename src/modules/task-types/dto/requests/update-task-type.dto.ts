import { IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateTaskTypeDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  description?: string;

  @IsNotEmpty()
  scope: string;

  @IsNotEmpty()
  hasDeadline: string;

  @IsNotEmpty()
  isRepeatable: string;

  @IsNotEmpty()
  updatedBy: string;
}
