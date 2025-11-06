export class TaskQuestionOption {
  optionId: string;
  text: string;
  isCorrect: boolean;
}

export class TaskQuestion {
  questionId: string;
  text: string;
  point: number;
  type: string;
  timeLimit?: number;
  image?: string;
  options?: TaskQuestionOption[];
}

export class TaskDetailResponseDto {
  taskId: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  subject: { subjectId: string; name: string };
  material?: { materialId: string; name: string };
  taskType: { taskTypeId: string; name: string };
  taskGradeIds: string[];
  taskGrade: string;
  questionCount: number;
  difficulty: string;
  startTime?: Date;
  endTime?: Date;
  duration?: string;
  createdBy: string;
  updatedBy?: string;
  questions: TaskQuestion[];
}
