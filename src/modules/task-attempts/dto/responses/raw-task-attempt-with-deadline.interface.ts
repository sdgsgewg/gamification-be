import { Task } from "src/modules/tasks/entities/task.entity";
import { TaskAttemptStatus } from "../../enums/task-attempt-status.enum";
import { Class } from "src/modules/classes/entities/class.entity";
import { TaskSubmission } from "src/modules/task-submissions/entities/task-submission.entity";

// dto/raw-task-attempt-with-deadline.interface.ts
export interface TaskAttemptWithDeadline {
  task_attempt_id: string;
  status: TaskAttemptStatus;
  started_at: Date;
  last_accessed_at: Date;
  completed_at: Date;

  task: Task;
  class: Class | null;
  taskSubmission?: TaskSubmission;

  class_deadline?: Date | null;
  task_deadline?: Date | null;
}
