import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { TaskSubmissionStatus } from '../../enums/task-submission-status.enum';

class UpdateAnswerLogDto {
  @IsNotEmpty()
  answerLogId: string;

  @IsNotEmpty()
  isCorrect: boolean;

  @IsOptional()
  pointAwarded?: number;

  @IsOptional()
  teacherNotes?: string;
}

export class UpdateTaskSubmissionDto {
  @IsNotEmpty()
  score: number; // total score

  @IsNotEmpty()
  status: TaskSubmissionStatus;

  @IsOptional()
  feedback?: string; // overall feedback

  @ValidateNested({ each: true })
  @Type(() => UpdateAnswerLogDto)
  answers: UpdateAnswerLogDto[];
}
