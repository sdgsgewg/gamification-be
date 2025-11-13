import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';
import { TaskDifficulty } from '../../enums/task-difficulty.enum';

export class CreateTaskQuestionOptionDto {
  @IsNotEmpty()
  text: string;

  @IsNotEmpty()
  isCorrect: boolean;
}

export class CreateTaskQuestionDto {
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
  options?: CreateTaskQuestionOptionDto[];
}

export class CreateTaskDto {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  creatorId: string;

  @IsNotEmpty()
  subjectId: string;

  @IsNotEmpty()
  taskTypeId: string;

  @IsNotEmpty()
  gradeIds: string[];

  @IsNotEmpty()
  createdBy: string;

  @IsNotEmpty()
  difficulty: TaskDifficulty;

  @IsOptional()
  description?: string;

  @IsOptional()
  materialId?: string;

  @IsOptional()
  startTime?: Date;

  @IsOptional()
  endTime?: Date;

  @ValidateIf(() => false) // skip validator juga
  imageFile?: any;

  @IsNotEmpty()
  questions: CreateTaskQuestionDto[];
}
