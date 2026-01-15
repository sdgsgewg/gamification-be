import { TaskTypeScope } from 'src/modules/task-types/enums/task-type-scope.enum';
import { TaskStatus } from '../../enums/task-status.enum';
import { QuestionResponseDto } from 'src/modules/task-questions/dto/responses/question-response.dto';
import { BaseTaskDetail } from './task-detail-base';
import { BaseTaskType } from 'src/modules/task-types/dto/responses/task-type-base';
import { TaskDuration } from './task-duration.dto';

export interface TaskDetail extends BaseTaskDetail {
  type: BaseTaskType & {
    scope: TaskTypeScope;
  };
  gradeIds: string[];
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

export class TaskHistory {
  createdBy: string;
  publishedAt?: string;
  finalizedAt?: string;
  archivedAt?: string;
  updatedBy?: string;
}

export class TaskDetailResponseDto {
  id: string;
  taskDetail: TaskDetail;
  assignedClasses?: AssignedClassInfo[];
  duration?: TaskDuration;
  history: TaskHistory;
  questions: QuestionResponseDto[];
}
