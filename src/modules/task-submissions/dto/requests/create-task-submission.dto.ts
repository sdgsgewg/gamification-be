import { IsNotEmpty } from 'class-validator';

export class CreateTaskSubmissionDto {
  @IsNotEmpty()
  taskAttemptId: string;
}
