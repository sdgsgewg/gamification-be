import { CreateTaskAttemptDto } from 'src/modules/task-attempts/dto/requests/create-task-attempt.dto';
import { TaskAttempt } from 'src/modules/task-attempts/entities/task-attempt.entity';
import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';

export class TaskAttemptHelper {
  /**
   * Return the primary date for a task attempt based on its status.
   * @param attempt The task attempt object.
   * @returns The primary date as a Date object or null if not applicable.
   */
  static getPrimaryDateForAttempt(attempt: TaskAttempt): Date | null {
    const status = attempt.status;

    switch (status) {
      case TaskAttemptStatus.NOT_STARTED:
      case TaskAttemptStatus.ON_PROGRESS:
        return attempt.last_accessed_at ?? null;

      case TaskAttemptStatus.SUBMITTED:
        return attempt.taskSubmission?.created_at ?? null;

      case TaskAttemptStatus.COMPLETED:
        return attempt.completed_at ?? null;

      case TaskAttemptStatus.PAST_DUE:
        return attempt.task?.end_time ?? null;

      default:
        return null;
    }
  }

  /**
   * Return the completed_at date if the task is completed.
   * @param questionCount The total number of questions in the task.
   * @param answeredQuestionCount The number of questions answered by the student.
   * @param isClassTask Boolean indicating if the task is a class task.
   * @returns The completed_at date as a Date object or null if not completed.
   */
  static getCompletedAt(
    questionCount: number,
    answeredQuestionCount: number,
    isClassTask = false,
  ): Date | null {
    return answeredQuestionCount >= questionCount && !isClassTask
      ? new Date()
      : null;
  }

  /**
   * Return true if the provided dto is a CreateTaskAttemptDto.
   * @param dto The dto object to check.
   * @returns The boolean result of the check.
   */
  static isCreateDto(dto: any): dto is CreateTaskAttemptDto {
    return (
      (dto as CreateTaskAttemptDto).taskId !== undefined ||
      (dto as CreateTaskAttemptDto).studentId !== undefined
    );
  }
}
