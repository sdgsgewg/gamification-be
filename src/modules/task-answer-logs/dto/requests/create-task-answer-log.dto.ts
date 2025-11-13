import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class CreateTaskAnswerLogDto {
  @IsNotEmpty()
  questionId: string;

  @IsNotEmpty()
  optionId: string;

  @IsOptional()
  answerText?: string;

  @ValidateIf(() => false) // selalu skip validator
  imageFile?: any;
}
