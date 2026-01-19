import { IsNotEmpty, IsOptional } from 'class-validator';
import { UpdateTaskAnswerLogDto } from 'src/modules/task-answer-logs/dto/requests/update-task-answer-log.dto';

export class UpdateTaskAttemptDto {
  @IsNotEmpty()
  answeredQuestionCount: number;

  @IsNotEmpty()
  lastAccessedAt: Date;

  @IsOptional()
  startedAt: Date;

  @IsOptional()
  answerLogs?: UpdateTaskAnswerLogDto[];
}
