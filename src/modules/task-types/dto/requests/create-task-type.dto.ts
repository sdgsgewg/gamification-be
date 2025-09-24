import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTaskTypeDto {
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
  createdBy: string;
}
