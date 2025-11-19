import { AnswerLogResponseDto } from 'src/modules/task-answer-logs/dto/responses/answer-log-response.dto';
import { QuestionOptionResponseDto } from 'src/modules/task-question-options/dto/responses/question-option-response.dto';

export class QuestionResponseDto {
  questionId: string;
  text: string;
  point: number;
  type: string;
  timeLimit?: number;
  image?: string;
  options?: QuestionOptionResponseDto[];
  userAnswer?: AnswerLogResponseDto;
}
