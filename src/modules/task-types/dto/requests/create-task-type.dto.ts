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
  isRepeatable: string;

  @IsNotEmpty()
  createdBy: string;
}
