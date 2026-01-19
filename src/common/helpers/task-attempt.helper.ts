import { CreateTaskAttemptDto } from 'src/modules/task-attempts/dto/requests/create-task-attempt.dto';
import { TaskAttemptAnalyticsDto } from 'src/modules/task-attempts/dto/responses/attempt-analytics/task-attempt-analytics-response.dto';
import { TaskAttempt } from 'src/modules/task-attempts/entities/task-attempt.entity';
import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';
import { getTimePeriod } from '../utils/date-modifier.util';

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
        return this.resolveDeadline(attempt);

      default:
        return null;
    }
  }

  /**
   * Return the deadline date for a task attempt.
   * @param attempt The task attempt object.
   * @returns The deadline date as a Date object or null if not applicable.
   */
  static resolveDeadline(attempt: any): Date | null {
    // PRIORITAS CLASS TASK
    if (attempt.class_deadline) {
      return attempt.class_deadline;
    }

    return attempt.task_deadline ?? null;
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

  /**
   * Calculate the duration of a task attempt.
   * @param startedAt The start time of the attempt.
   * @param submittedAt The submission time of the attempt.
   * @param completedAt The completion time of the attempt.
   * @returns The duration as a string or null if not applicable.
   */
  static calculateDuration(
    startedAt?: Date | null,
    submittedAt?: Date | null,
    completedAt?: Date | null,
  ): string | null {
    const endTime = submittedAt ?? completedAt;

    if (!startedAt || !endTime) {
      return null;
    }

    return getTimePeriod(startedAt, endTime);
  }

  /**
   * Return the attempt distribution analytics.
   * @param studentMap The map of student attempts.
   * @returns The attempt distribution analytics.
   */
  static calculateAttemptDistribution(
    studentMap: Map<string, TaskAttempt[]>,
    getScore: (attempt: TaskAttempt) => number | null,
  ): TaskAttemptAnalyticsDto[] {
    const attemptScores = new Map<number, number[]>();

    studentMap.forEach((attempts) => {
      const sorted = [...attempts].sort(
        (a, b) =>
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
      );

      sorted.forEach((attempt, index) => {
        const score = getScore(attempt);
        if (score === null) return;

        const attemptNumber = index + 1;

        if (!attemptScores.has(attemptNumber)) {
          attemptScores.set(attemptNumber, []);
        }

        attemptScores.get(attemptNumber)!.push(score);
      });
    });

    return [...attemptScores.entries()]
      .sort(([a], [b]) => a - b)
      .map(([attemptNumber, scores]) => ({
        attemptNumber,
        averageScore: Number(
          (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
        ),
      }));
  }
}
