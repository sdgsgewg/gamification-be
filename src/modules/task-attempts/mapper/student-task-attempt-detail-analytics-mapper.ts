import { ClassTask } from 'src/modules/class-tasks/entities/class-task.entity';
import { TaskAttempt } from '../entities/task-attempt.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { StudentTaskAttemptDetailAnalyticsResponseDto } from '../dto/responses/attempt-analytics/student-task-attempt-detail-analytics-response.dto';
import { TaskAttemptStatus } from '../enums/task-attempt-status.enum';
import { TaskAttemptHelper } from 'src/common/helpers/task-attempt.helper';
import { TaskHelper } from 'src/common/helpers/task.helper';
import { TaskAttemptResponseMapper } from './task-attempt-response.mapper';

export class StudentTaskAttemptDetailAnalyticsMapper {
  static mapClass(
    classTask: ClassTask,
    attempts: TaskAttempt[],
  ): StudentTaskAttemptDetailAnalyticsResponseDto {
    return this.build({
      task: classTask.task,
      attempts,
      classInfo: {
        name: classTask.class.name,
        slug: classTask.class.slug,
        deadline: classTask.end_time,
      },
    });
  }

  static mapActivity(
    task: Task,
    attempts: TaskAttempt[],
  ): StudentTaskAttemptDetailAnalyticsResponseDto {
    return this.build({ task, attempts });
  }

  // -----------------------------
  private static build({
    task,
    attempts,
    classInfo,
  }: {
    task: Task;
    attempts: TaskAttempt[];
    classInfo?: {
      name: string;
      slug: string;
      deadline?: Date;
    };
  }): StudentTaskAttemptDetailAnalyticsResponseDto {
    if (attempts.length === 0) {
      return {
        studentId: '',
        studentName: '',
        task: {
          title: task.title,
          slug: task.slug,
          totalQuestion: task.taskQuestions.length,
          maxPoint: task.taskQuestions.reduce((a, q) => a + q.point, 0),
        },
        totalAttempts: 0,
        latestStatus: TaskAttemptStatus.NOT_STARTED,
        attempts: [],
        ...(classInfo && { class: classInfo }),
      };
    }

    const maxPoint = TaskHelper.calculateTaskMaxPoint(task);
    const sorted = TaskAttemptHelper.sortAllAttempts(attempts);

    const scores = sorted
      .map((a) => TaskAttemptHelper.calculateAttemptScore(a))
      .filter((s): s is number => s !== null);

    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const latest = sorted[sorted.length - 1];

    return {
      studentId: latest.student.user_id,
      studentName: latest.student.name,

      task: {
        title: task.title,
        slug: task.slug,
        totalQuestion: task.taskQuestions.length,
        maxPoint,
      },

      totalAttempts: sorted.length,
      firstAttemptScore: firstScore,
      lastAttemptScore: lastScore,
      averageScore: TaskAttemptHelper.calculateAttemptsAverageScore(scores),
      improvement: TaskAttemptHelper.calculateScoreImprovement(
        scores,
        lastScore,
        firstScore,
      ),

      latestStatus: latest.status,
      latestSubmissionId: latest.taskSubmission?.task_submission_id,
      attempts: TaskAttemptResponseMapper.mapStudentRecentAttempts(sorted),
      
      ...(classInfo && { class: classInfo }),
    };
  }
}
