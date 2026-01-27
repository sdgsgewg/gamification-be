import { CreateTaskAttemptDto } from 'src/modules/task-attempts/dto/requests/create-task-attempt.dto';
import { TaskAttempt } from 'src/modules/task-attempts/entities/task-attempt.entity';
import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';
import { getTimePeriod } from '../utils/date-modifier.util';
import { AttemptAnalyticsDto } from 'src/modules/task-attempts/dto/responses/attempt-analytics/attempt-analytics-response.dto';
import { TaskAttemptScope } from 'src/modules/task-attempts/enums/task-attempt-scope.enum';
import { ClassTask } from 'src/modules/class-tasks/entities/class-task.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';

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

  // -----------------------------
  // OVERVIEW & DETAIL ANALYTICS HELPER
  // -----------------------------

  /**
   * Calculate the score of a task attempt.
   * @param attempt The task attempt.
   * @returns The score as a number or null if not applicable.
   */
  static calculateAverageScore(scores: number[]): number | null {
    return scores.length > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
      : 0;
  }

  // -----------------------------
  // OVERVIEW ANALYTICS HELPER
  // -----------------------------

  static calculateTotalAttempt(attempts: TaskAttempt[]): number {
    return attempts.length;
  }

  static calculateCompletedAttempt(attempts: TaskAttempt[]): number {
    return attempts.filter((a) => a.status === TaskAttemptStatus.COMPLETED)
      .length;
  }

  // -----------------------------
  // DETAIL ANALYTICS HELPER
  // -----------------------------

  /**
   * Calculate the maximum point of a task.
   * @param task The task.
   * @returns The max point as a number.
   */
  static calculateTaskMaxPoint(
    scope: TaskAttemptScope,
    item: ClassTask | Task,
  ): number {
    return scope === TaskAttemptScope.CLASS
      ? (item as ClassTask).task.taskQuestions.reduce((a, q) => a + q.point, 0)
      : (item as Task).taskQuestions.reduce((a, q) => a + q.point, 0);
  }

  /**
   * Sort all task attempts by started_at in ascending.
   * @param attempts All task attempts.
   * @returns The sorted attempst as a list.
   */
  static sortAllAttempts(attempts: TaskAttempt[]): TaskAttempt[] {
    // DEFAULT: started_at ascending
    return [...attempts].sort(
      (a, b) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    );
  }

  /**
   * Calculate the score of a task attempt.
   * @param attempt The task attempt.
   * @returns The score as a number or null if not applicable.
   */
  static calculateAttemptScore(attempt: TaskAttempt): number | null {
    const maxPoint = attempt.task.taskQuestions.reduce(
      (a, q) => a + q.point,
      0,
    );

    return attempt.points !== null && maxPoint > 0
      ? Number(((attempt.points / maxPoint) * 100).toFixed(2))
      : null;
  }

  /**
   * Calculate the average score of all attempts
   * @param scores The score distribution of all atempts.
   * @returns The average score of all attempts.
   */
  static calculateAttemptsAverageScore(scores: number[]): number {
    return scores.length > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
      : 0;
  }

  /**
   * Calculate the improvement from first and last score of all attempts
   * @param scores The score distribution of all atempts.
   * @param lastScore The last score of all atempts.
   * @param firstScore The first score of all atempts.
   * @returns The score improvement as a number (+/-).
   */
  static calculateScoreImprovement(
    scores: number[],
    lastScore: number,
    firstScore: number,
  ): number {
    return scores.length > 1 ? Number((lastScore - firstScore).toFixed(2)) : 0;
  }

  /**
   * Return the attempt distribution analytics.
   * @param studentMap The map of student attempts.
   * @returns The attempt distribution analytics.
   */
  static calculateAttemptDistribution(
    studentMap: Map<string, TaskAttempt[]>,
  ): AttemptAnalyticsDto[] {
    const attemptScores = new Map<number, number[]>();

    studentMap.forEach((attempts) => {
      const sorted = [...attempts].sort(
        (a, b) =>
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
      );

      sorted.forEach((attempt, index) => {
        const score = this.calculateAttemptScore(attempt);
        // if (score === null) return;

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
