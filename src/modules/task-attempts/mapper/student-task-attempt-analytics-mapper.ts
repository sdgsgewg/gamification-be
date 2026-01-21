import { ClassTask } from 'src/modules/class-tasks/entities/class-task.entity';
import { TaskAttemptScope } from '../enums/task-attempt-scope.enum';
import { TaskAttempt } from '../entities/task-attempt.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { StudentTaskAttemptAnalyticsResponseDto } from '../dto/responses/attempt-analytics/student-task-attempt-analytics-response.dto';
import { TaskAttemptHelper } from 'src/common/helpers/task-attempt.helper';

type MapInput =
  | {
      scope: TaskAttemptScope.CLASS;
      items: ClassTask[];
      attempts: TaskAttempt[];
    }
  | {
      scope: TaskAttemptScope.ACTIVITY;
      attempts: TaskAttempt[];
    };

export class StudentTaskAttemptAnalyticsMapper {
  static map(input: MapInput): StudentTaskAttemptAnalyticsResponseDto[] {
    if (input.attempts.length === 0) return [];

    if (input.scope === TaskAttemptScope.CLASS) {
      return this.mapClassScope(input.items, input.attempts);
    }

    return this.mapActivityScope(input.attempts);
  }

  // -----------------------------
  // CLASS SCOPE
  // -----------------------------
  private static mapClassScope(
    classTasks: ClassTask[],
    attempts: TaskAttempt[],
  ): StudentTaskAttemptAnalyticsResponseDto[] {
    const attemptsByKey = new Map<string, TaskAttempt[]>();

    for (const a of attempts) {
      const key = `${a.class_id}-${a.task_id}`;
      if (!attemptsByKey.has(key)) attemptsByKey.set(key, []);
      attemptsByKey.get(key)!.push(a);
    }

    return classTasks.map((ct) => {
      const key = `${ct.class_id}-${ct.task_id}`;
      const taskAttempts = attemptsByKey.get(key) ?? [];

      return this.buildResponse({
        task: ct.task,
        attempts: taskAttempts,
        classTask: ct,
      });
    });
  }

  // -----------------------------
  // ACTIVITY SCOPE
  // -----------------------------
  private static mapActivityScope(
    attempts: TaskAttempt[],
  ): StudentTaskAttemptAnalyticsResponseDto[] {
    const attemptsByTask = new Map<string, TaskAttempt[]>();

    for (const a of attempts) {
      if (!attemptsByTask.has(a.task_id)) {
        attemptsByTask.set(a.task_id, []);
      }
      attemptsByTask.get(a.task_id)!.push(a);
    }

    return [...attemptsByTask.values()].map((taskAttempts) => {
      return this.buildResponse({
        task: taskAttempts[0].task,
        attempts: taskAttempts,
      });
    });
  }

  // -----------------------------
  // SHARED BUILDER
  // -----------------------------
  private static buildResponse({
    task,
    attempts,
    classTask,
  }: {
    task: Task;
    attempts: TaskAttempt[];
    classTask?: ClassTask;
  }): StudentTaskAttemptAnalyticsResponseDto {
    const totalAttempts = TaskAttemptHelper.calculateTotalAttempt(attempts);
    const completedAttempts =
      TaskAttemptHelper.calculateCompletedAttempt(attempts);

    return {
      task: {
        title: task.title,
        slug: task.slug,
        isRepeatable: task.taskType.is_repeatable,
      },
      completedAttemptCount: completedAttempts,
      totalAttemptCount: totalAttempts,
      ...(classTask && {
        class: {
          name: classTask.class.name,
          slug: classTask.class.slug,
        },
        deadline: classTask.end_time?.toISOString() ?? null,
      }),
    };
  }
}
