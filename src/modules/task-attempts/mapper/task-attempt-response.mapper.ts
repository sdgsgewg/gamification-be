import {
  getDateTime,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import {
  ActivityProgress,
  ActivityStats,
  ActivitySummaryResponseDto,
} from 'src/modules/activities/dto/responses/activity-summary-response.dto';
import { TaskAttempt } from 'src/modules/task-attempts/entities/task-attempt.entity';
import {
  TaskAttemptStatus,
  TaskAttemptStatusLabels,
} from '../enums/task-attempt-status.enum';
import {
  ClassTaskAttemptProgress,
  ClassTaskGradingProgress,
  ClassTaskStats,
  ClassTaskSummaryResponseDto,
} from 'src/modules/class-tasks/dto/responses/class-task-summary-response.dto';
import { QuestionResponseDto } from 'src/modules/task-questions/dto/responses/question-response.dto';
import { QuestionOptionResponseDto } from 'src/modules/task-question-options/dto/responses/question-option-response.dto';
import { AnswerLogResponseDto } from 'src/modules/task-answer-logs/dto/responses/answer-log-response.dto';
import { ClassTaskAttemptResponseDto } from '../dto/responses/student-attempt/class-task-attempt-response.dto';
import { ClassTask } from 'src/modules/class-tasks/entities/class-task.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { ActivityTaskAttemptResponseDto } from '../dto/responses/student-attempt/activity-task-attempt-response.dto';
import { ClassTaskStudentAttemptResponseDto } from '../dto/responses/student-attempt/class-task-student-attempt-response.dto';
import { StudentTaskAttemptAnalyticsDto } from '../dto/responses/student-attempt/student-task-attempt-analytics-response.dto';
import { ActivityTaskStudentAttemptResponseDto } from '../dto/responses/student-attempt/activity-task-student-attempt-response.dto';

export class TaskAttemptResponseMapper {
  // ===========================
  // CLASS TASK ATTEMPT
  // ===========================
  static mapClassTaskAttempts(
    classTasks: ClassTask[],
    attempts: TaskAttempt[],
  ): ClassTaskAttemptResponseDto[] {
    // Grouping: classId-taskId
    const attemptMap = new Map<string, TaskAttempt[]>();

    for (const attempt of attempts) {
      const key = `${attempt.class_id}-${attempt.task_id}`;
      if (!attemptMap.has(key)) {
        attemptMap.set(key, []);
      }
      attemptMap.get(key)!.push(attempt);
    }

    return classTasks.map((ct) => {
      const key = `${ct.class_id}-${ct.task_id}`;
      const taskAttempts = attemptMap.get(key) ?? [];

      const totalStudents = ct.class.classStudents.length;

      const attemptsByStudent = new Map<string, TaskAttempt[]>();
      taskAttempts.forEach((a) => {
        if (!attemptsByStudent.has(a.student_id)) {
          attemptsByStudent.set(a.student_id, []);
        }
        attemptsByStudent.get(a.student_id)!.push(a);
      });

      const studentsAttempted = attemptsByStudent.size;

      let completedCount = 0;
      const latestScores: number[] = [];
      const allScores: number[] = [];
      let totalAttempts = 0;

      attemptsByStudent.forEach((studentAttempts) => {
        totalAttempts += studentAttempts.length;

        const sorted = [...studentAttempts].sort(
          (a, b) =>
            new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
        );

        const latest = sorted[sorted.length - 1];

        if (latest.status === TaskAttemptStatus.COMPLETED) {
          completedCount++;
        }

        if (latest.points !== null) {
          latestScores.push(latest.points);
        }

        sorted.forEach((a) => {
          if (a.points !== null) {
            allScores.push(a.points);
          }
        });
      });

      return {
        class: {
          name: ct.class.name,
          slug: ct.class.slug,
        },
        task: {
          title: ct.task.title,
          slug: ct.task.slug,
          isRepeatable: ct.task.taskType.is_repeatable,
        },
        totalStudents,
        studentsAttempted,
        studentsCompleted: completedCount,
        avgScoreLatestAttempt:
          latestScores.length > 0
            ? Number(
                (
                  latestScores.reduce((a, b) => a + b, 0) / latestScores.length
                ).toFixed(2),
              )
            : 0,
        avgScoreAllAttempts:
          allScores.length > 0
            ? Number(
                (
                  allScores.reduce((a, b) => a + b, 0) / allScores.length
                ).toFixed(2),
              )
            : 0,
        avgAttemptsPerStudent:
          studentsAttempted > 0
            ? Number((totalAttempts / studentsAttempted).toFixed(2))
            : 0,
        deadline: ct.end_time?.toISOString() ?? null,
      };
    });
  }

  // ===========================
  // ACTIVITY ATTEMPT
  // ===========================
  static mapActivityTaskAttempts(
    tasks: Task[],
    attempts: TaskAttempt[],
  ): ActivityTaskAttemptResponseDto[] {
    // Grouping: taskId
    const attemptMap = new Map<string, TaskAttempt[]>();

    for (const attempt of attempts) {
      const key = `${attempt.class_id}-${attempt.task_id}`;
      if (!attemptMap.has(key)) {
        attemptMap.set(key, []);
      }
      attemptMap.get(key)!.push(attempt);
    }

    return tasks.map((t) => {
      const key = `${t.task_id}`;
      const taskAttempts = attemptMap.get(key) ?? [];

      const attemptsByStudent = new Map<string, TaskAttempt[]>();
      taskAttempts.forEach((a) => {
        if (!attemptsByStudent.has(a.student_id)) {
          attemptsByStudent.set(a.student_id, []);
        }
        attemptsByStudent.get(a.student_id)!.push(a);
      });

      const studentsAttempted = attemptsByStudent.size;

      let completedCount = 0;
      const latestScores: number[] = [];
      const allScores: number[] = [];
      let totalAttempts = 0;

      attemptsByStudent.forEach((studentAttempts) => {
        totalAttempts += studentAttempts.length;

        const sorted = [...studentAttempts].sort(
          (a, b) =>
            new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
        );

        const latest = sorted[sorted.length - 1];

        if (latest.status === TaskAttemptStatus.COMPLETED) {
          completedCount++;
        }

        if (latest.points !== null) {
          latestScores.push(latest.points);
        }

        sorted.forEach((a) => {
          if (a.points !== null) {
            allScores.push(a.points);
          }
        });
      });

      return {
        task: {
          title: t.title,
          slug: t.slug,
          isRepeatable: t.taskType.is_repeatable,
        },
        studentsAttempted,
        studentsCompleted: completedCount,
        avgScoreLatestAttempt:
          latestScores.length > 0
            ? Number(
                (
                  latestScores.reduce((a, b) => a + b, 0) / latestScores.length
                ).toFixed(2),
              )
            : 0,
        avgScoreAllAttempts:
          allScores.length > 0
            ? Number(
                (
                  allScores.reduce((a, b) => a + b, 0) / allScores.length
                ).toFixed(2),
              )
            : 0,
        avgAttemptsPerStudent:
          studentsAttempted > 0
            ? Number((totalAttempts / studentsAttempted).toFixed(2))
            : 0,
      };
    });
  }

  // =========================================
  // STUDENT ATTEMPTS ON CLASS TASK
  // =========================================
  static mapStudentAttemptsFromClassTask(
    classTask: ClassTask,
    attempts: TaskAttempt[],
  ): ClassTaskStudentAttemptResponseDto {
    if (!attempts.length) {
      return {
        class: {
          name: classTask.class.name,
        },
        task: {
          title: classTask.task.title,
          slug: classTask.task.slug,
        },
        averageScoreAllStudents: 0,
        averageAttempts: 0,
        students: [],
      };
    }

    // Group by student
    const studentMap = new Map<string, TaskAttempt[]>();

    attempts.forEach((attempt) => {
      if (!studentMap.has(attempt.student_id)) {
        studentMap.set(attempt.student_id, []);
      }
      studentMap.get(attempt.student_id)!.push(attempt);
    });

    let totalScore = 0;
    let totalAttempts = 0;

    const students: StudentTaskAttemptAnalyticsDto[] = [];

    studentMap.forEach((studentAttempts, studentId) => {
      const sorted = [...studentAttempts].sort(
        (a, b) =>
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
      );

      const scores = sorted
        .map((a) => a.points)
        .filter((p): p is number => p !== null);

      const firstScore = scores[0];
      const lastScore = scores[scores.length - 1];

      totalScore += scores.reduce((a, b) => a + b, 0);
      totalAttempts += sorted.length;

      const latestAttempt = sorted[sorted.length - 1];

      students.push({
        studentId,
        studentName: sorted[0].student.name,

        totalAttempts: sorted.length,
        firstAttemptScore: firstScore,
        lastAttemptScore: lastScore,
        averageScore:
          scores.length > 0
            ? Number(
                (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
              )
            : 0,
        improvement: scores.length > 1 ? lastScore - firstScore : 0,

        latestStatus: latestAttempt.status,
        latestSubmissionId:
          latestAttempt.taskSubmission?.task_submission_id ?? undefined,

        attempts: sorted.map((a, idx) => ({
          submissionId: a.taskSubmission?.task_submission_id,
          attemptNumber: idx + 1,
          attemptId: a.task_attempt_id,
          score: a.points,
          status: a.status,
          completedAt: a.completed_at,
        })),
      });
    });

    return {
      class: {
        name: classTask.class.name,
      },
      task: {
        title: classTask.task.title,
        slug: classTask.task.slug,
      },
      averageScoreAllStudents:
        totalAttempts > 0 ? Number((totalScore / totalAttempts).toFixed(2)) : 0,
      averageAttempts:
        students.length > 0
          ? Number((totalAttempts / students.length).toFixed(2))
          : 0,
      students,
    };
  }

  // =========================================
  // STUDENT ATTEMPTS ON ACTIVITY TASK
  // =========================================
  static mapStudentAttemptsFromActivityTask(
    task: Task,
    attempts: TaskAttempt[],
  ): ActivityTaskStudentAttemptResponseDto {
    if (!attempts.length) {
      return {
        task: {
          title: task.title,
          slug: task.slug,
        },
        averageScoreAllStudents: 0,
        averageAttempts: 0,
        students: [],
      };
    }

    // Group by student
    const studentMap = new Map<string, TaskAttempt[]>();

    attempts.forEach((attempt) => {
      if (!studentMap.has(attempt.student_id)) {
        studentMap.set(attempt.student_id, []);
      }
      studentMap.get(attempt.student_id)!.push(attempt);
    });

    let totalScore = 0;
    let totalAttempts = 0;

    const students: StudentTaskAttemptAnalyticsDto[] = [];

    studentMap.forEach((studentAttempts, studentId) => {
      const sorted = [...studentAttempts].sort(
        (a, b) =>
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
      );

      const scores = sorted
        .map((a) => a.points)
        .filter((p): p is number => p !== null);

      const firstScore = scores[0];
      const lastScore = scores[scores.length - 1];

      totalScore += scores.reduce((a, b) => a + b, 0);
      totalAttempts += sorted.length;

      const latestAttempt = sorted[sorted.length - 1];

      students.push({
        studentId,
        studentName: sorted[0].student.name,

        totalAttempts: sorted.length,
        firstAttemptScore: firstScore,
        lastAttemptScore: lastScore,
        averageScore:
          scores.length > 0
            ? Number(
                (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
              )
            : 0,
        improvement: scores.length > 1 ? lastScore - firstScore : 0,

        latestStatus: latestAttempt.status,
        latestSubmissionId:
          latestAttempt.taskSubmission?.task_submission_id ?? undefined,

        attempts: sorted.map((a, idx) => ({
          submissionId: a.taskSubmission?.task_submission_id,
          attemptNumber: idx + 1,
          attemptId: a.task_attempt_id,
          score: a.points,
          status: a.status,
          completedAt: a.completed_at,
        })),
      });
    });

    return {
      task: {
        title: task.title,
        slug: task.slug,
      },
      averageScoreAllStudents:
        totalAttempts > 0 ? Number((totalScore / totalAttempts).toFixed(2)) : 0,
      averageAttempts:
        students.length > 0
          ? Number((totalAttempts / students.length).toFixed(2))
          : 0,
      students,
    };
  }

  // ===========================
  // CLASS TASK SUMMARY
  // ===========================
  static mapClassTaskSummaryFromAttempt(
    attempt: TaskAttempt,
  ): ClassTaskSummaryResponseDto {
    const { title, image, description, taskQuestions } = attempt.task;
    const {
      points,
      xp_gained,
      started_at,
      status,
      task,
      taskAnswerLogs,
      taskSubmission,
    } = attempt;

    const totalPoints = taskQuestions.reduce((acc, q) => acc + q.point, 0);

    const score = Math.round((points / totalPoints) * 100);

    const stats: ClassTaskStats = {
      pointGained: points,
      totalPoints,
      score,
      xpGained: xp_gained,
    };

    const attemptProgress: ClassTaskAttemptProgress = {
      startedAt: getDateTime(started_at),
      submittedAt: getDateTime(taskSubmission.created_at),
      duration: getTimePeriod(started_at, taskSubmission.created_at),
      status: TaskAttemptStatusLabels[status],
    };

    const gradingProgress: ClassTaskGradingProgress = {
      startGradedAt: getDateTime(taskSubmission.start_graded_at),
      lastGradedAt: getDateTime(taskSubmission.last_graded_at),
      finishGradedAt: getDateTime(taskSubmission.finish_graded_at),
      duration: getTimePeriod(
        taskSubmission.start_graded_at,
        taskSubmission.finish_graded_at,
      ),
      status: TaskAttemptStatusLabels[taskSubmission.status],
    };

    const questions: QuestionResponseDto[] =
      task.taskQuestions?.map((q) => {
        const userAnswer = taskAnswerLogs?.find(
          (log) => log.question_id === q.task_question_id,
        );

        const options: QuestionOptionResponseDto[] =
          q.taskQuestionOptions?.map((o) => ({
            optionId: o.task_question_option_id,
            text: o.text,
            isCorrect: !!o.is_correct,
            isSelected: userAnswer?.option_id === o.task_question_option_id,
          })) || [];

        const answerLog: AnswerLogResponseDto | null = userAnswer
          ? {
              answerLogId: userAnswer.task_answer_log_id ?? null,
              text: userAnswer.answer_text ?? null,
              image: userAnswer.image ?? null,
              optionId: userAnswer.option_id ?? null,
              isCorrect:
                typeof userAnswer.is_correct === 'boolean'
                  ? userAnswer.is_correct
                  : null,
              pointAwarded: userAnswer.point_awarded ?? null,
              teacherNotes: userAnswer.teacher_notes ?? null,
            }
          : null;

        return {
          questionId: q.task_question_id,
          text: q.text,
          point: q.point,
          type: q.type,
          timeLimit: q.time_limit ?? null,
          image: q.image ?? null,
          options,
          userAnswer: answerLog,
        };
      }) || [];

    return {
      title,
      image,
      description,
      teacherName: attempt.class.teacher?.name ?? 'Unknown',
      className: attempt.class.name,
      stats,
      attemptProgress,
      gradingProgress,
      questions,
    };
  }

  // ===========================
  // ACTIVITY SUMMARY
  // ===========================
  static mapActivitySummaryFromAttempt(
    attempt: TaskAttempt,
  ): ActivitySummaryResponseDto {
    const { title, image, description, created_by, taskQuestions } =
      attempt.task;
    const {
      points,
      xp_gained,
      started_at,
      completed_at,
      status,
      task,
      taskAnswerLogs,
    } = attempt;

    const totalPoints = taskQuestions.reduce((acc, q) => acc + q.point, 0);

    const score = Math.round((points / totalPoints) * 100);

    const stats: ActivityStats = {
      pointGained: points,
      totalPoints,
      score,
      xpGained: xp_gained,
    };

    const progress: ActivityProgress = {
      startedAt: getDateTime(started_at),
      completedAt: getDateTime(completed_at),
      duration: getTimePeriod(started_at, completed_at),
      status: TaskAttemptStatusLabels[status],
    };

    const questions =
      task.taskQuestions?.map((q) => {
        const userAnswer = taskAnswerLogs.find(
          (log) => log.question_id === q.task_question_id,
        );

        return {
          questionId: q.task_question_id,
          text: q.text,
          point: q.point,
          type: q.type,
          timeLimit: q.time_limit ?? null,
          image: q.image ?? null,
          options: q.taskQuestionOptions?.map((o) => ({
            optionId: o.task_question_option_id,
            text: o.text,
            isCorrect: o.is_correct,
            isSelected: userAnswer?.option_id === o.task_question_option_id,
          })),
          userAnswer: userAnswer
            ? {
                answerLogId: userAnswer.task_answer_log_id,
                text: userAnswer.answer_text,
                image: userAnswer.image,
                optionId: userAnswer.option_id,
                isCorrect: userAnswer.is_correct,
              }
            : null,
        };
      }) || [];

    return {
      title,
      image,
      description,
      createdBy: created_by,
      stats,
      progress,
      questions,
    };
  }
}
