import { ClassTask } from 'src/modules/class-tasks/entities/class-task.entity';
import { TaskAttemptScope } from '../enums/task-attempt-scope.enum';
import { TaskAttempt } from '../entities/task-attempt.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { TaskAttemptAnalyticsResponseDto } from '../dto/responses/attempt-analytics/task-attempt-analytics-response.dto';
import { TaskAttemptStatus } from '../enums/task-attempt-status.enum';

type MapInput =
  | {
      scope: TaskAttemptScope.CLASS;
      items: ClassTask[];
      attempts: TaskAttempt[];
    }
  | {
      scope: TaskAttemptScope.ACTIVITY;
      items: Task[];
      attempts: TaskAttempt[];
    };

export class TaskAttemptAnalyticsMapper {
  static map(input: MapInput): TaskAttemptAnalyticsResponseDto[] {
    // Guard mapper for no attempts
    if (input.attempts.length === 0) {
      return [];
    }

    const attemptMap = new Map<string, TaskAttempt[]>();

    for (const a of input.attempts) {
      const key = this.buildKey(input.scope, {
        classId: a.class_id,
        taskId: a.task_id,
      });

      if (!attemptMap.has(key)) attemptMap.set(key, []);
      attemptMap.get(key)!.push(a);
    }

    return input.items.map((item) => {
      const key =
        input.scope === TaskAttemptScope.CLASS
          ? this.buildKey(input.scope, {
              classId: (item as ClassTask).class_id,
              taskId: (item as ClassTask).task_id,
            })
          : this.buildKey(input.scope, {
              taskId: (item as Task).task_id,
            });

      const taskAttempts = attemptMap.get(key) ?? [];

      return this.calculateAnalytics(item, taskAttempts, input.scope);
    });
  }

  private static buildKey(
    scope: TaskAttemptScope,
    params: { classId?: string; taskId: string },
  ): string {
    return scope === TaskAttemptScope.CLASS
      ? `${params.classId}-${params.taskId}`
      : params.taskId;
  }

  private static calculateAnalytics(
    item: ClassTask | Task,
    attempts: TaskAttempt[],
    scope: TaskAttemptScope,
  ): TaskAttemptAnalyticsResponseDto {
    const attemptsByStudent = new Map<string, TaskAttempt[]>();

    attempts.forEach((a) => {
      if (!attemptsByStudent.has(a.student_id)) {
        attemptsByStudent.set(a.student_id, []);
      }
      attemptsByStudent.get(a.student_id)!.push(a);
    });

    let completed = 0;
    let totalAttempts = 0;
    const latestScores: number[] = [];
    const allScores: number[] = [];

    attemptsByStudent.forEach((list) => {
      totalAttempts += list.length;
      const latest = list
        .sort(
          (a, b) =>
            new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
        )
        .at(-1)!;

      if (latest.status === TaskAttemptStatus.COMPLETED) completed++;

      if (latest.points !== null) latestScores.push(latest.points);
      list.forEach((a) => a.points !== null && allScores.push(a.points));
    });

    const base = {
      task: {
        title:
          scope === TaskAttemptScope.CLASS
            ? (item as ClassTask).task.title
            : (item as Task).title,
        slug:
          scope === TaskAttemptScope.CLASS
            ? (item as ClassTask).task.slug
            : (item as Task).slug,
        isRepeatable:
          scope === TaskAttemptScope.CLASS
            ? (item as ClassTask).task.taskType.is_repeatable
            : (item as Task).taskType.is_repeatable,
      },
      studentsAttempted: attemptsByStudent.size,
      studentsCompleted: completed,
      avgScoreLatestAttempt: latestScores.length
        ? Number(
            (
              latestScores.reduce((a, b) => a + b, 0) / latestScores.length
            ).toFixed(2),
          )
        : 0,
      avgScoreAllAttempts: allScores.length
        ? Number(
            (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(
              2,
            ),
          )
        : 0,
      avgAttemptsPerStudent: attemptsByStudent.size
        ? Number((totalAttempts / attemptsByStudent.size).toFixed(2))
        : 0,
    };

    if (scope === TaskAttemptScope.CLASS) {
      return {
        ...base,
        class: {
          name: (item as ClassTask).class.name,
          slug: (item as ClassTask).class.slug,
        },
        totalStudents: (item as ClassTask).class.classStudents.length,
        deadline: (item as ClassTask).end_time?.toISOString() ?? null,
      };
    }

    return base;
  }
}
