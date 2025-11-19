export class AnswerLogResponseDto {
  answerLogId: string | null;
  text: string | null;
  image: string | null;
  optionId: string | null;
  isCorrect: boolean | null;
  pointAwarded?: number | null;
  teacherNotes?: string | null;
}
