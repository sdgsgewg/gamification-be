import { IsNotEmpty, IsOptional } from 'class-validator';
import { CreateTaskAnswerLogDto } from 'src/modules/task-answer-logs/dto/requests/create-task-answer-log.dto';

export class CreateTaskAttemptDto {
  @IsNotEmpty()
  answeredQuestionCount: number;

  @IsNotEmpty()
  taskId: string;

  @IsNotEmpty()
  studentId: string;

  @IsOptional()
  answerLogs?: CreateTaskAnswerLogDto[];
}
