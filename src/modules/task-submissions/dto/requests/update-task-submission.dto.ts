import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { TaskSubmissionStatus } from '../../enums/task-submission-status.enum';

class UpdateAnswerLogDto {
  @IsNotEmpty()
  answerLogId: string;

  @IsOptional()
  isCorrect?: boolean;

  @IsOptional()
  pointAwarded?: number;

  @IsOptional()
  teacherNotes?: string;
}

export class UpdateTaskSubmissionDto {
  @IsNotEmpty()
  status: TaskSubmissionStatus;

  @IsOptional()
  startGradedAt?: Date;

  @IsNotEmpty()
  lastGradedAt: Date;

  @IsOptional()
  feedback?: string; // overall feedback

  @ValidateNested({ each: true })
  @Type(() => UpdateAnswerLogDto)
  answers: UpdateAnswerLogDto[];
}
