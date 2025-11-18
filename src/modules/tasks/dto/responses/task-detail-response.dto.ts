import { TaskTypeScope } from 'src/modules/task-types/enums/task-type-scope.enum';
import { TaskStatus } from '../../enums/task-status.enum';

export class TaskType {
  id: string;
  name: string;
  scope: TaskTypeScope;
}

export class TaskDetail {
  title: string;
  slug: string;
  description?: string;
  image?: string;
  subject: { subjectId: string; name: string };
  material?: { materialId: string; name: string };
  taskType: TaskType;
  taskGradeIds: string[];
  taskGrade: string;
  questionCount: number;
  difficulty: string;
  status: TaskStatus;
}

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
  publishedAt?: string;
  finalizedAt?: string;
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
  id: string;
  taskDetail: TaskDetail;
  assignedClasses?: AssignedClassInfo[];
  duration?: TaskDuration;
  history: TaskHistory;
  questions: TaskQuestion[];
}
