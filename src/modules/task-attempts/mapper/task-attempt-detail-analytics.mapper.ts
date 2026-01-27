import { ClassTask } from 'src/modules/class-tasks/entities/class-task.entity';
import { TaskAttemptScope } from '../enums/task-attempt-scope.enum';
import { TaskAttempt } from '../entities/task-attempt.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { TaskAttemptDetailAnalyticsResponseDto } from '../dto/responses/attempt-analytics/task-attempt-detail-analytics-response.dto';
import { TaskAttemptHelper } from 'src/common/helpers/task-attempt.helper';
import { StudentAttemptAnalyticsDto } from '../dto/responses/attempt-analytics/student-attempt-analytics-response.dto';

type DetailMapInput =
  | {
      scope: TaskAttemptScope.CLASS;
      item: ClassTask;
      attempts: TaskAttempt[];
    }
  | {
      scope: TaskAttemptScope.ACTIVITY;
      item: Task;
      attempts: TaskAttempt[];
    };

export class TaskAttemptDetailAnalyticsMapper {
  static map(input: DetailMapInput): TaskAttemptDetailAnalyticsResponseDto {
    const studentMap = new Map<string, TaskAttempt[]>();

    input.attempts.forEach((a) => {
      if (!studentMap.has(a.student_id)) {
        studentMap.set(a.student_id, []);
      }
      studentMap.get(a.student_id)!.push(a);
    });

    const attemptDistributions =
      TaskAttemptHelper.calculateAttemptDistribution(studentMap);

    let totalScore = 0;
    let totalAttempts = 0;

    const students: StudentAttemptAnalyticsDto[] = [];

    studentMap.forEach((studentAttempts, studentId) => {
      const sorted = TaskAttemptHelper.sortAllAttempts(studentAttempts);

      const scores = sorted
        .map((a) => TaskAttemptHelper.calculateAttemptScore(a))
        .filter((s): s is number => s !== null);

      totalScore += scores.reduce((a, b) => a + b, 0);
      totalAttempts += sorted.length;

      const firstScore = scores[0];
      const lastScore = scores[scores.length - 1];
      const latest = sorted[sorted.length - 1];

      students.push({
        studentId,
        studentName: sorted[0].student.name,
        totalAttempts: sorted.length,
        firstAttemptScore: firstScore,
        lastAttemptScore: lastScore,
        averageScore: TaskAttemptHelper.calculateAverageScore(scores),
        improvement: TaskAttemptHelper.calculateScoreImprovement(
          scores,
          lastScore,
          firstScore,
        ),
        latestStatus: latest.status,
        latestSubmissionId:
          latest.taskSubmission?.task_submission_id ?? undefined,
        attempts: sorted.map((a, idx) => {
          const scope = a.class_id
            ? TaskAttemptScope.CLASS
            : TaskAttemptScope.ACTIVITY;

          return {
            submissionId: a.taskSubmission?.task_submission_id,
            attemptNumber: idx + 1,
            attemptId: a.task_attempt_id,
            class: a.class
              ? {
                  name: a.class.name,
                  slug: a.class.slug,
                }
              : null,
            task: {
              slug: a.task.slug,
            },
            scope,
            score: TaskAttemptHelper.calculateAttemptScore(a),
            status: a.status,
            completedAt: a.completed_at,
          };
        }),
      });
    });

    const base = {
      task: {
        title:
          input.scope === TaskAttemptScope.CLASS
            ? input.item.task.title
            : input.item.title,
        slug:
          input.scope === TaskAttemptScope.CLASS
            ? input.item.task.slug
            : input.item.slug,
      },
      averageScoreAllStudents:
        totalAttempts > 0 ? Number((totalScore / totalAttempts).toFixed(2)) : 0,
      totalAttempts: input.attempts.length,
      averageAttempts:
        students.length > 0
          ? Number((totalAttempts / students.length).toFixed(2))
          : 0,
      attempts: attemptDistributions,
      students,
    };

    if (input.scope === TaskAttemptScope.CLASS) {
      return {
        ...base,
        class: {
          name: input.item.class.name,
        },
      };
    }

    return base;
  }
}
