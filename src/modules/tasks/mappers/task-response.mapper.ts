import { ClassTaskDetailResponseDto } from 'src/modules/class-tasks/dto/responses/class-task-detail-response.dto';
import { Task } from '../entities/task.entity';
import { CurrentAttemptResponseDto } from 'src/modules/task-attempts/dto/responses/current-attempt-response.dto';
import { RecentAttemptResponseDto } from 'src/modules/task-attempts/dto/responses/recent-attempt-response.dto';
import { TaskDifficultyLabels } from '../enums/task-difficulty.enum';
import { TaskAttemptStatus } from 'src/modules/task-attempts/enums/task-attempt-status.enum';
import { ClassTask } from 'src/modules/class-tasks/entities/class-task.entity';
import {
  getDateTime,
  getDateTimeWithName,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import { ActivityDetailResponseDto } from 'src/modules/activities/dto/responses/activity-detail-response.dto';
import { TaskAnswerLog } from 'src/modules/task-answer-logs/entities/task-answer-log.entity';
import { ClassTaskWithQuestionsResponseDto } from 'src/modules/class-tasks/dto/responses/class-task-with-questions-response.dto';
import { BaseTaskDetail } from '../dto/responses/task-detail-base';
import { TaskDetailResponseDto } from '../dto/responses/task-detail-response.dto';
import { ActivityWithQuestionsResponseDto } from 'src/modules/activities/dto/responses/activity-with-questions-response.dto';

export class TaskResponseMapper {
  // ===========================
  // BASE TASK DETAIL
  // ===========================
  static mapTaskDetailBase(task: Task): BaseTaskDetail {
    return {
      title: task.title,
      slug: task.slug,
      description: task.description ?? null,
      image: task.image ?? null,
      subject: task.subject
        ? { id: task.subject.subject_id, name: task.subject.name }
        : null,
      material: task.material
        ? { id: task.material.material_id, name: task.material.name }
        : null,
      grade:
        task.taskGrades?.length > 0
          ? task.taskGrades
              .map((tg) => tg.grade?.name?.replace('Kelas ', ''))
              .join(', ')
          : null,
      questionCount: task.taskQuestions?.length || 0,
      difficulty: TaskDifficultyLabels[task.difficulty] ?? 'Unknown',
      createdBy: task.created_by ?? 'Unknown',
    };
  }

  // ===========================
  // ATTEMPT SECTION
  // ===========================
  static mapAttemptSection(
    currAttemptMeta: CurrentAttemptResponseDto,
    recentAttemptsMeta: RecentAttemptResponseDto[],
  ) {
    return {
      currAttempt:
        currAttemptMeta?.status === TaskAttemptStatus.ON_PROGRESS
          ? currAttemptMeta
          : null,
      recentAttempts:
        recentAttemptsMeta && recentAttemptsMeta.length > 0
          ? recentAttemptsMeta
          : [],
    };
  }

  // ===========================
  // TASK DETAIL
  // ===========================
  static mapTaskDetail(task: Task): TaskDetailResponseDto {
    return {
      id: task.task_id,
      taskDetail: {
        ...this.mapTaskDetailBase(task),
        type: {
          id: task.taskType.task_type_id,
          name: task.taskType.name,
          scope: task.taskType.scope,
        },
        gradeIds: task.taskGrades
          ? task.taskGrades.map((tg) => tg.gradeId)
          : [],
        status: task.status,
      },
      duration: {
        startTime: task.start_time ?? null,
        endTime: task.end_time ?? null,
        duration: getTimePeriod(task.start_time, task.end_time),
      },
      history: {
        createdBy: `${getDateTimeWithName(task.created_at, task.created_by)}`,
        updatedBy: task.updated_by
          ? `${getDateTimeWithName(task.updated_at, task.updated_by)}`
          : null,
        finalizedAt: task.finalized_at ? getDateTime(task.finalized_at) : null,
        publishedAt: task.published_at ? getDateTime(task.published_at) : null,
        archivedAt: task.archived_at ? getDateTime(task.archived_at) : null,
      },
      questions:
        task.taskQuestions?.map((q) => ({
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
          })),
        })) || [],
    };
  }

  // ===========================
  // CLASS TASK DETAIL
  // ===========================
  static mapClassTaskDetail(
    classTask: ClassTask,
    currAttemptMeta: CurrentAttemptResponseDto,
    recentAttemptsMeta: RecentAttemptResponseDto[],
  ): ClassTaskDetailResponseDto {
    const { task } = classTask;

    return {
      id: task.task_id,
      taskDetail: {
        ...this.mapTaskDetailBase(task),
        subtitle: `From class '${classTask.class.name}'`,
        type: {
          id: task.taskType.task_type_id,
          name: task.taskType.name,
          isRepeatable: task.taskType.is_repeatable,
        },
      },
      duration: {
        startTime: classTask.start_time ?? null,
        endTime: classTask.end_time ?? null,
        duration: getTimePeriod(classTask.start_time, classTask.end_time),
      },
      ...this.mapAttemptSection(currAttemptMeta, recentAttemptsMeta),
    };
  }

  // ===========================
  // ACTIVITY DETAIL
  // ===========================
  static mapActivityDetail(
    task: Task,
    currAttemptMeta: CurrentAttemptResponseDto,
    recentAttemptsMeta: RecentAttemptResponseDto[],
  ): ActivityDetailResponseDto {
    return {
      id: task.task_id,
      taskDetail: {
        ...this.mapTaskDetailBase(task),
        type: {
          id: task.taskType.task_type_id,
          name: task.taskType.name,
          isRepeatable: task.taskType.is_repeatable,
        },
      },
      duration: {
        startTime: task.start_time ?? null,
        endTime: task.end_time ?? null,
        duration: getTimePeriod(task.start_time, task.end_time),
      },
      ...this.mapAttemptSection(currAttemptMeta, recentAttemptsMeta),
    };
  }

  // ===========================
  // CLASS TASK WITH QUESTIONS
  // ===========================
  static mapClassTaskWithQuestions(
    task: Task,
    lastAttemptId: string | null,
    answerLogs: TaskAnswerLog[],
  ): ClassTaskWithQuestionsResponseDto {
    return {
      id: task.task_id,
      lastAttemptId,
      startTime: task.start_time ?? null,
      endTime: task.end_time ?? null,
      duration: getTimePeriod(task.start_time, task.end_time),
      questions:
        task.taskQuestions?.map((q) => {
          const userAnswer = answerLogs.find(
            (log) => log.question_id === q.task_question_id,
          );

          return {
            questionId: q.task_question_id,
            text: q.text,
            point: q.point,
            type: q.type,
            timeLimit: q.time_limit && q.time_limit > 0 ? q.time_limit : null,
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
                  text: userAnswer.answer_text ?? null,
                  image: userAnswer.image ?? null,
                  optionId: userAnswer.option_id ?? null,
                  isCorrect: userAnswer.is_correct ?? null,
                }
              : null,
          };
        }) ?? [],
    };
  }

  // ===========================
  // ACTIVITY WITH QUESTIONS
  // ===========================
  static mapActivityWithQuestionsResponse(
    taskWithRelations: Task,
    lastAttemptId: string | null,
    answerLogs: TaskAnswerLog[],
  ): ActivityWithQuestionsResponseDto {
    const data: ActivityWithQuestionsResponseDto = {
      id: taskWithRelations.task_id,
      lastAttemptId: lastAttemptId ?? null,
      startTime: taskWithRelations.start_time ?? null,
      endTime: taskWithRelations.end_time ?? null,
      duration: getTimePeriod(
        taskWithRelations.start_time,
        taskWithRelations.end_time,
      ),
      questions:
        taskWithRelations.taskQuestions?.map((q) => {
          const userAnswer = answerLogs.find(
            (log) => log.question_id === q.task_question_id,
          );

          return {
            questionId: q.task_question_id,
            text: q.text,
            point: q.point,
            type: q.type,
            timeLimit: q.time_limit && q.time_limit > 0 ? q.time_limit : null,
            image: q.image ?? null,
            options: q.taskQuestionOptions?.map((o) => ({
              optionId: o.task_question_option_id,
              text: o.text,
              isCorrect: o.is_correct,
              // Auto-fill: tandai jawaban user
              isSelected: userAnswer?.option_id === o.task_question_option_id,
            })),
            // Tambahkan jawaban text atau image user (jika ada)
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
        }) || [],
    };

    return data;
  }
}
