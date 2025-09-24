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
  isCompetitive: string;

  @IsNotEmpty()
  isRepeatable: string;

  @IsNotEmpty()
  pointMultiplier: number;

  @IsNotEmpty()
  updatedBy: string;
}
