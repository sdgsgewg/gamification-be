import { IsNotEmpty, IsOptional } from 'class-validator';
import { TaskTypeScope } from '../../enums/task-type-scope.enum';

export class CreateTaskTypeDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  description?: string;

  @IsNotEmpty()
  scope: TaskTypeScope;

  @IsNotEmpty()
  hasDeadline: string;

  @IsNotEmpty()
  isRepeatable: string;

  @IsNotEmpty()
  createdBy: string;
}
