import { IsNotEmpty, IsOptional } from 'class-validator';
import { UpdateTaskAnswerLogDto } from 'src/modules/task-answer-logs/dto/requests/update-task-answer-log.dto';
import { TaskAttemptStatus } from '../../enums/task-attempt-status.enum';

export class UpdateTaskAttemptDto {
  @IsNotEmpty()
  answeredQuestionCount: number;

  @IsNotEmpty()
  status: TaskAttemptStatus;

  @IsOptional()
  answerLogs?: UpdateTaskAnswerLogDto[];
}
