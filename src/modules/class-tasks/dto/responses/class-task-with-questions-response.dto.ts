import { QuestionResponseDto } from 'src/modules/task-questions/dto/responses/question-response.dto';

export class ClassTaskWithQuestionsResponseDto {
  id: string;
  classId: string;
  taskId: string;
  lastAttemptId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: string;
  questions: QuestionResponseDto[];
}
