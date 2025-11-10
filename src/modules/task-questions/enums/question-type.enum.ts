export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FILL_BLANK = 'fill_blank',
  ESSAY = 'essay',
}

export const QuestionTypeLabels: Record<QuestionType, string> = {
  [QuestionType.MULTIPLE_CHOICE]: 'Pilihan Ganda',
  [QuestionType.TRUE_FALSE]: 'Benar/Salah',
  [QuestionType.FILL_BLANK]: 'Isian',
  [QuestionType.ESSAY]: 'Esai',
};
