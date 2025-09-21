import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateTaskQuestionOptionDto {
  @IsNotEmpty()
  optionId: string;

  @IsNotEmpty()
  text: string;

  @IsNotEmpty()
  isCorrect: boolean;
}

export class UpdateTaskQuestionDto {
  @IsNotEmpty()
  questionId: string;

  @IsNotEmpty()
  text: string;

  @IsNotEmpty()
  point: number;

  @IsNotEmpty()
  type: string;

  @IsOptional()
  timeLimit?: number;

  @ValidateIf(() => false) // selalu skip validator
  imageFile?: any;

  @IsOptional()
  options?: UpdateTaskQuestionOptionDto[];
}

export class UpdateTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  subjectId: string;

  @IsNotEmpty()
  @IsString()
  taskTypeId: string;

  @IsNotEmpty()
  @IsString()
  gradeIds: string[];

  @IsNotEmpty()
  @IsString()
  updatedBy: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsOptional()
  startTime?: Date;

  @IsOptional()
  endTime?: Date;

  @ValidateIf(() => false) // selalu skip validator
  imageFile?: any;

  @IsNotEmpty()
  questions: UpdateTaskQuestionDto[];
}
