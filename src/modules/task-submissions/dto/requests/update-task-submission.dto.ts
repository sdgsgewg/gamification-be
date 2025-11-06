import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';

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

  @IsOptional()
  feedback?: string; // overall feedback

  @ValidateNested({ each: true })
  @Type(() => UpdateAnswerLogDto)
  answers: UpdateAnswerLogDto[];
}
