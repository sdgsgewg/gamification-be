import { QuestionResponseDto } from 'src/modules/task-questions/dto/responses/question-response.dto';

export class ActivityWithQuestionsResponseDto {
  id: string;
  lastAttemptId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: string;
  questions: QuestionResponseDto[];
}
