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
import { TaskAttemptStatusLabels } from '../enums/task-attempt-status.enum';
import {
  ClassTaskAttemptProgress,
  ClassTaskGradingProgress,
  ClassTaskStats,
  ClassTaskSummaryResponseDto,
} from 'src/modules/class-tasks/dto/responses/class-task-summary-response.dto';
import { QuestionResponseDto } from 'src/modules/task-questions/dto/responses/question-response.dto';
import { QuestionOptionResponseDto } from 'src/modules/task-question-options/dto/responses/question-option-response.dto';
import { AnswerLogResponseDto } from 'src/modules/task-answer-logs/dto/responses/answer-log-response.dto';

export class TaskAttemptResponseMapper {
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
