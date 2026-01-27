import {
  getDate,
  getDateTime,
  getTime,
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
import {
  TaskAttemptDetailResponseDto,
  TaskAttemptProgress,
  TaskAttemptStats,
} from '../dto/responses/task-attempt-detail.dto';
import { TaskDifficultyLabels } from 'src/modules/tasks/enums/task-difficulty.enum';
import { GroupedTaskAttemptResponseDto } from '../dto/responses/grouped-task-attempt.dto';
import { TaskAttemptHelper } from 'src/common/helpers/task-attempt.helper';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ClassResponseDto } from '../dto/responses/task-attempt-overview.dto';
import { StudentAttemptDetailDto } from '../dto/responses/attempt-analytics/student-attempt-detail-response.dto';
import { TaskAttemptScope } from '../enums/task-attempt-scope.enum';

export class TaskAttemptResponseMapper {
  // ===========================
  // TASK ATTEMPTS (HISTORY & DASHBOARD STUDENT TASK)
  // ===========================
  static mapAndGroupTaskAttempts(
    attempts: TaskAttempt[],
  ): GroupedTaskAttemptResponseDto[] {
    const grouped = attempts.reduce(
      (acc, attempt) => {
        const { task_attempt_id, status, last_accessed_at, completed_at } =
          attempt;

        const dateObj = TaskAttemptHelper.getPrimaryDateForAttempt(attempt);

        const dateKey = dateObj ? format(dateObj, 'yyyy-MM-dd') : 'no-date';

        if (!acc[dateKey]) {
          if (dateObj) {
            acc[dateKey] = {
              dateLabel: format(dateObj, 'd MMM yyyy', { locale: id }),
              dayLabel: format(dateObj, 'EEEE', { locale: id }),
              attempts: [],
            };
          } else {
            acc[dateKey] = {
              dateLabel: 'Not Started',
              dayLabel: '',
              attempts: [],
            };
          }
        }

        const classData: ClassResponseDto = attempt.class
          ? {
              name: attempt.class.name,
              slug: attempt.class.slug,
            }
          : null;

        const deadline = TaskAttemptHelper.resolveDeadline(attempt);

        acc[dateKey].attempts.push({
          id: task_attempt_id,
          title: attempt.task?.title ?? 'Unknown Task',
          image:
            attempt.task?.image && attempt.task.image !== ''
              ? attempt.task.image
              : null,
          status,
          class: classData,
          taskSlug: attempt.task?.slug ?? null,
          deadline: deadline ? getDate(deadline) : null,
          lastAccessedTime: getTime(last_accessed_at),
          submittedTime: attempt.taskSubmission?.created_at
            ? getTime(attempt.taskSubmission.created_at)
            : null,
          completedTime: completed_at ? getTime(completed_at) : null,
        });

        return acc;
      },
      {} as Record<string, GroupedTaskAttemptResponseDto>,
    );

    return Object.values(grouped);
  }

  // ==============================
  // TASK ATTEMPT DETAIL (HISTORY & DASHBOARD STUDENT TASK)
  // ==============================
  static mapTaskAttemptDetail(
    attempt: TaskAttempt,
  ): TaskAttemptDetailResponseDto {
    const {
      title,
      slug,
      image,
      description,
      subject,
      material,
      taskType,
      taskGrades,
      difficulty,
      taskQuestions,
      start_time,
      end_time,
      created_by,
    } = attempt.task;
    const {
      answered_question_count,
      points,
      xp_gained,
      started_at,
      last_accessed_at,
      completed_at,
      status,
      task,
      taskAnswerLogs,
    } = attempt;

    const totalPoints = taskQuestions.reduce(
      (acc, question) => acc + (question.point ?? 0),
      0,
    );

    const score = Math.round((points / totalPoints) * 100);

    const stats: TaskAttemptStats = {
      pointGained: points,
      xpGained: xp_gained,
      totalPoints,
      score,
    };

    const rawStatus = status as string | null;

    const normalizedStatus = Object.values(TaskAttemptStatus).includes(
      rawStatus as TaskAttemptStatus,
    )
      ? (rawStatus as TaskAttemptStatus)
      : TaskAttemptStatus.NOT_STARTED;

    const progress: TaskAttemptProgress = {
      startedAt: getDateTime(started_at),
      lastAccessedAt: getDateTime(last_accessed_at),
      completedAt: getDateTime(completed_at),
      timeTaken: getTimePeriod(started_at, completed_at),
      status: normalizedStatus,
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
      slug,
      image,
      description,
      subject: subject.name,
      material: material ? material.name : null,
      grade:
        taskGrades.length > 0
          ? taskGrades
              .map((tg) => tg.grade.name.replace('Kelas ', ''))
              .join(', ')
          : null,
      questionCount: taskQuestions.length,
      difficulty: TaskDifficultyLabels[difficulty],
      createdBy: created_by || 'Unknown',
      type: {
        name: taskType.name,
        isRepeatable: taskType.is_repeatable,
      },
      attempt: {
        answeredCount: answered_question_count ?? 0,
      },
      stats,
      duration: {
        startTime: start_time ?? null,
        endTime: end_time ?? null,
        duration: getTimePeriod(start_time, end_time),
      },
      progress,
      questions,
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
      completed_at,
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

    // Attempt Progress
    const completedAt = completed_at ? getDateTime(completed_at) : null;
    const submittedAt = taskSubmission ? taskSubmission.created_at : null;
    const duration = submittedAt
      ? getTimePeriod(started_at, submittedAt)
      : getTimePeriod(started_at, completed_at);

    const attemptProgress: ClassTaskAttemptProgress = {
      startedAt: getDateTime(started_at),
      completedAt,
      submittedAt: getDateTime(submittedAt),
      duration,
      status: TaskAttemptStatusLabels[status],
    };

    // Grading Progress
    const gradingProgress: ClassTaskGradingProgress = taskSubmission
      ? {
          startGradedAt: getDateTime(taskSubmission.start_graded_at),
          lastGradedAt: getDateTime(taskSubmission.last_graded_at),
          finishGradedAt: getDateTime(taskSubmission.finish_graded_at),
          duration: getTimePeriod(
            taskSubmission.start_graded_at,
            taskSubmission.finish_graded_at,
          ),
          status: TaskAttemptStatusLabels[taskSubmission.status],
        }
      : null;

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

  // ===========================
  // STUDENT RECENT ATTEMPTS
  // ===========================
  static mapStudentRecentAttempts(
    recentAttempts: TaskAttempt[],
  ): StudentAttemptDetailDto[] {
    const data: StudentAttemptDetailDto[] = recentAttempts.map((ra, idx) => {
      const scope = ra.class_id
        ? TaskAttemptScope.CLASS
        : TaskAttemptScope.ACTIVITY;

      const modifiedScope = scope.charAt(0).toUpperCase() + scope.slice(1);

      return {
        attemptNumber: idx + 1,
        attemptId: ra.task_attempt_id,
        class: ra.class
          ? {
              name: ra.class.name,
              slug: ra.class.slug,
            }
          : null,
        task: {
          slug: ra.task.slug,
        },
        scope: modifiedScope,
        score: TaskAttemptHelper.calculateAttemptScore(ra),
        status: ra.status,
        completedAt: ra.completed_at,
      };
    });

    return data;
  }
}
