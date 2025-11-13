import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class UpdateTaskAnswerLogDto {
  @IsNotEmpty()
  answerLogId: string;

  @IsNotEmpty()
  questionId: string;

  @IsOptional()
  optionId?: string;

  @IsOptional()
  answerText?: string;

  @ValidateIf(() => false) // selalu skip validator
  imageFile?: any;
}
