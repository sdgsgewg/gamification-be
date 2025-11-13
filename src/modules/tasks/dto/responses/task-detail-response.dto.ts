export class AssignedClassInfo {
  id: string;
  name: string;
  slug: string;
  submissionCount: number; // Jumlah siswa yang sudah submit
  totalStudents: number; // Jumlah total siswa di kelas
  gradedCount: number; // Jumlah submission yang sudah dinilai
  deadline?: string; // Tenggat waktu tugas
}

export class TaskDuration {
  startTime?: Date;
  endTime?: Date;
  duration?: string;
}

export class TaskHistory {
  createdBy: string;
  updatedBy?: string;
}

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
  assignedClasses?: AssignedClassInfo[];
  duration?: TaskDuration;
  history: TaskHistory;
  questions: TaskQuestion[];
}
