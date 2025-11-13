import { IsNotEmpty, IsOptional } from 'class-validator';
import { CreateTaskAnswerLogDto } from 'src/modules/task-answer-logs/dto/requests/create-task-answer-log.dto';
import { TaskAttemptStatus } from '../../enums/task-attempt-status.enum';

export class CreateTaskAttemptDto {
  @IsNotEmpty()
  answeredQuestionCount: number;

  @IsNotEmpty()
  status: TaskAttemptStatus;

  @IsNotEmpty()
  startedAt: Date;

  @IsNotEmpty()
  lastAccessedAt: Date;

  @IsNotEmpty()
  taskId: string;

  @IsNotEmpty()
  studentId: string;

  @IsOptional()
  classId: string;

  @IsOptional()
  answerLogs?: CreateTaskAnswerLogDto[];
}
