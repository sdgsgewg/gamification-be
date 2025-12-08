import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  Raw,
  Not,
  IsNull,
} from 'typeorm';
import { TaskAttempt } from './entities/task-attempt.entity';
import { CreateTaskAttemptDto } from './dto/requests/create-task-attempt.dto';
import { UpdateTaskAttemptDto } from './dto/requests/update-task-attempt.dto';
import { TaskAnswerLogService } from '../task-answer-logs/task-answer-logs.service';
import { Task } from '../tasks/entities/task.entity';
import { TaskQuestionOption } from '../task-question-options/entities/task-question-option.entity';
import { UserService } from '../users/users.service';
import { DetailResponseDto } from 'src/common/responses/detail-response.dto';
import { UpsertTaskAttemptResponseDto } from './dto/responses/upsert-task-attempt.dto';
import { LevelHelper } from 'src/common/helpers/level.helper';
import {
  TaskAttemptDetailResponseDto,
  TaskAttemptProgress,
  TaskAttemptStats,
} from './dto/responses/task-attempt-detail.dto';
import {
  getDate,
  getDateTime,
  getTime,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import { FilterTaskAttemptDto } from './dto/requests/filter-task-attempt.dto';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { GroupedTaskAttemptResponseDto } from './dto/responses/grouped-task-attempt.dto';
import { TaskAttemptStatus } from './enums/task-attempt-status.enum';
import { TaskSubmissionService } from '../task-submissions/task-submissions.service';
import { TaskXpHelper } from 'src/common/helpers/task-xp.helper';
import { TaskDifficultyLabels } from '../tasks/enums/task-difficulty.enum';
import { ActivityLogService } from '../activty-logs/activity-logs.service';
import { getActivityLogDescription } from 'src/common/utils/get-activity-log-description.util';
import { ActivityLogEventType } from '../activty-logs/enums/activity-log-event-type';
import { UserRole } from '../roles/enums/user-role.enum';
import { getResponseMessage } from 'src/common/utils/get-response-message.util';
import { MostPopularTaskResponseDto } from './dto/responses/most-popular-task-response.dto';
import { ClassResponseDto } from './dto/responses/task-attempt-overview.dto';

@Injectable()
export class TaskAttemptService {
  constructor(
    @InjectRepository(TaskAttempt)
    private readonly taskAttemptRepository: Repository<TaskAttempt>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskQuestionOption)
    private readonly taskQuestionOptionRepository: Repository<TaskQuestionOption>,
    private readonly taskAnswerLogService: TaskAnswerLogService,
    private readonly userService: UserService,
    private readonly taskSubmissionService: TaskSubmissionService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async findAllTaskAttemptsByUser(
    userId: string,
    filterDto: FilterTaskAttemptDto,
  ): Promise<GroupedTaskAttemptResponseDto[]> {
    if (!userId) {
      throw new NotFoundException(`No user with id ${userId}`);
    }

    const where: any = {
      student_id: userId,
    };

    if (filterDto.status) {
      where.status = filterDto.status;
    }

    if (filterDto.isClassTask) {
      where.class_id = Not(IsNull());
    } else {
      where.class_id = IsNull();
    }

    if (filterDto.dateFrom && filterDto.dateTo) {
      where.last_accessed_at = Between(filterDto.dateFrom, filterDto.dateTo);
    } else if (filterDto.dateFrom) {
      where.last_accessed_at = MoreThanOrEqual(filterDto.dateFrom);
    } else if (filterDto.dateTo) {
      where.last_accessed_at = LessThanOrEqual(filterDto.dateTo);
    }

    if (filterDto.searchText) {
      where.task = {
        ...where.task,
        title: Raw((alias) => `${alias} ILIKE :title`, {
          title: `%${filterDto.searchText}%`,
        }),
      };
    }

    const orderBy = filterDto.orderBy ?? 'last_accessed_at';
    const orderState = filterDto.orderState ?? 'DESC';

    const attempts = await this.taskAttemptRepository.find({
      where,
      relations: {
        task: true,
        class: true,
        taskSubmission: true,
      },
      order: {
        [orderBy]: orderState,
      },
    });

    if (attempts.length === 0) {
      throw new NotFoundException(
        `No attempt found for user with id ${userId}`,
      );
    }

    return this.mapAndGroupTaskAttempts(attempts);
  }

  private getPrimaryDateForAttempt(attempt: TaskAttempt): Date | null {
    const status = attempt.status;

    switch (status) {
      case TaskAttemptStatus.NOT_STARTED:
      case TaskAttemptStatus.ON_PROGRESS:
        return attempt.last_accessed_at
          ? new Date(attempt.last_accessed_at)
          : null;

      case TaskAttemptStatus.SUBMITTED:
        return attempt.taskSubmission?.created_at
          ? new Date(attempt.taskSubmission.created_at)
          : null;

      case TaskAttemptStatus.COMPLETED:
        return attempt.completed_at ? new Date(attempt.completed_at) : null;

      case TaskAttemptStatus.PAST_DUE:
        return attempt.task?.end_time ? new Date(attempt.task.end_time) : null;

      default:
        return null;
    }
  }

  private mapAndGroupTaskAttempts(
    attempts: TaskAttempt[],
  ): GroupedTaskAttemptResponseDto[] {
    const grouped = attempts.reduce(
      (acc, attempt) => {
        const { task_attempt_id, status, last_accessed_at, completed_at } =
          attempt;

        const dateObj = this.getPrimaryDateForAttempt(attempt);

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
          deadline: attempt.task?.end_time
            ? getDate(attempt.task.end_time)
            : null,
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

  async findMostPopularTask(
    creatorId: string,
  ): Promise<MostPopularTaskResponseDto[]> {
    const user = await this.userService.findUserBy('id', creatorId);

    const qb = this.taskAttemptRepository
      .createQueryBuilder('attempt')
      .leftJoin('attempt.task', 'task')
      .select([
        'task.task_id AS "taskId"',
        'task.title AS "title"',
        'COUNT(attempt.task_attempt_id) AS "attemptCount"',
        'task.created_by AS "createdBy"',
        'task.creator_id AS "creatorId"',
      ])
      .where('attempt.status IN (:...validStatuses)', {
        validStatuses: [
          TaskAttemptStatus.ON_PROGRESS,
          TaskAttemptStatus.SUBMITTED,
          TaskAttemptStatus.COMPLETED,
        ],
      })
      .groupBy('task.task_id')
      .orderBy('"attemptCount"', 'DESC')
      .limit(5);

    if (user.role.name === UserRole.TEACHER) {
      qb.andWhere('task.creator_id = :creatorId', { creatorId });
    }

    const result = await qb.getRawMany();

    if (!result) {
      return null;
    }

    const data = result.map((item) => ({
      id: item.taskId,
      title: item.title,
      attemptCount: Number(item.attemptCount),
      createdBy: item.createdBy,
    }));

    return data;
  }

  async findTaskAttemptById(attemptId: string) {
    const attempt = await this.taskAttemptRepository.findOne({
      where: {
        task_attempt_id: attemptId,
      },
      relations: {
        task: {
          subject: true,
          material: true,
          taskType: true,
          taskGrades: { grade: true },
          taskQuestions: {
            taskQuestionOptions: true,
          },
        },
        taskAnswerLogs: {
          question: true,
        },
      },
      order: {
        task: {
          taskQuestions: {
            order: 'ASC',
            taskQuestionOptions: {
              order: 'ASC',
            },
          },
        },
        taskAnswerLogs: {
          created_at: 'ASC',
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`No attempt found for id ${attemptId}`);
    }

    return this.mapTaskAttemptDetail(attempt);
  }

  private mapTaskAttemptDetail(
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

  // =========================
  // Helper: completedAt logic (tidak berubah)
  // =========================
  private getCompletedAt(
    questionCount: number,
    answeredQuestionCount: number,
    isClassTask = false,
  ): Date | null {
    return answeredQuestionCount >= questionCount && !isClassTask
      ? new Date()
      : null;
  }

  private async getTaskWithQuestions(taskId: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { task_id: taskId },
      relations: ['taskType', 'taskQuestions'],
    });

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    return task;
  }

  private async getLevelChangeData(
    userId: string,
    savedTaskAttempt: TaskAttempt,
  ): Promise<UpsertTaskAttemptResponseDto> {
    const user = await this.userService.findUserBy('id', userId);

    let leveledUp = false;
    let levelChangeSummary = null;

    if (user && savedTaskAttempt.xp_gained != null) {
      const levelChange = LevelHelper.getLevelChangeSummary(
        user.level,
        user.xp,
        savedTaskAttempt.xp_gained,
      );

      leveledUp = levelChange.leveledUp;
      levelChangeSummary = levelChange;
    }

    const data: UpsertTaskAttemptResponseDto = {
      id: savedTaskAttempt.task_attempt_id,
      leveledUp,
      levelChangeSummary,
    };

    return data;
  }

  // --------------------------
  // saveAnswerLogs (unchanged)
  // --------------------------
  private async saveAnswerLogs(
    attemptId: string,
    answerLogs: any[],
    isUpdate = false,
  ): Promise<void> {
    if (!answerLogs?.length) return;

    if (isUpdate) {
      await this.taskAnswerLogService.syncTaskAnswerLogs(attemptId, answerLogs);
    } else {
      await this.taskAnswerLogService.createTaskAnswerLogs(
        attemptId,
        answerLogs,
      );
    }
  }

  // --------------------------
  // buildTaskAttempt (SIMPLIFIED) - no xp/points computation here
  // --------------------------
  private async buildTaskAttempt(
    existing: TaskAttempt | null,
    task: Task,
    dto: CreateTaskAttemptDto | UpdateTaskAttemptDto,
    isClassTask = false,
  ): Promise<TaskAttempt> {
    const questionCount = task.taskQuestions.length;
    const { answeredQuestionCount } = dto;
    const completedAt = this.getCompletedAt(
      questionCount,
      answeredQuestionCount,
      isClassTask,
    );

    const attempt =
      existing ??
      this.taskAttemptRepository.create({
        ...(this.isCreateDto(dto) && { task_id: dto.taskId }),
        ...(this.isCreateDto(dto) && { student_id: dto.studentId }),
        ...(this.isCreateDto(dto) && isClassTask && { class_id: dto.classId }),
        ...(this.isCreateDto(dto) && { started_at: dto.startedAt }),
      });

    attempt.answered_question_count = answeredQuestionCount;
    attempt.status = dto.status;
    if (!attempt.started_at) attempt.started_at = dto.startedAt;
    attempt.last_accessed_at = dto.lastAccessedAt;
    // only set completed_at for non-class task (builder doesn't calculate XP)
    if (!isClassTask) attempt.completed_at = completedAt;

    // NOTE: removed XP/points calculation from builder — handled after saving logs
    return attempt;
  }

  // --------------------------
  // NEW HELPER: finalizePointsAndXp
  // - fetch saved answer logs
  // - call TaskXpHelper
  // - update attempt.points & attempt.xp_gained
  // - update user xp via userService.updateLevelAndXp
  // --------------------------
  private async finalizePointsAndXp(
    savedAttempt: TaskAttempt,
    task: Task,
  ): Promise<TaskAttempt> {
    // We expect taskAnswerLogService to be able to return saved logs by attempt id
    // Ensure taskAnswerLogService has method `findAllByAttemptId(attemptId)`
    const savedLogs = await this.taskAnswerLogService.findAllByAttemptId(
      savedAttempt.task_attempt_id,
    );

    // If there are no saved logs, just return
    if (!savedLogs || savedLogs.length === 0) return savedAttempt;

    const { points, xpGained } = await TaskXpHelper.calculatePointsAndXp(
      task,
      savedLogs,
    );

    savedAttempt.points = points;
    savedAttempt.xp_gained = xpGained;

    await this.taskAttemptRepository.save(savedAttempt);

    // Update user level & xp (only for non-class tasks) — caller ensures non-class
    if (savedAttempt.student_id && xpGained) {
      await this.userService.updateLevelAndXp(
        savedAttempt.student_id,
        xpGained,
      );
    }

    return savedAttempt;
  }

  // --------------------------
  // NEW HELPER: maybeCreateSubmissionForClassTask
  // --------------------------
  private async maybeCreateSubmissionForClassTask(
    savedAttempt: TaskAttempt,
    task: Task,
  ) {
    // Only for class tasks when status is SUBMITTED and all questions answered
    if (
      savedAttempt.class_id &&
      savedAttempt.status === TaskAttemptStatus.SUBMITTED &&
      savedAttempt.answered_question_count === task.taskQuestions.length
    ) {
      await this.taskSubmissionService.createTaskSubmission({
        taskAttemptId: savedAttempt.task_attempt_id,
      });
    }
  }

  // --------------------------
  // NEW HELPER: persistAttemptAndLogs (core unified flow)
  // - create/update attempt
  // - save logs
  // - finalize points/xp (only for non-class + completed)
  // - maybe create submission for class tasks
  // - save activity log
  // - return level change data
  // --------------------------
  private async persistAttemptAndLogs(
    existing: TaskAttempt | null,
    task: Task,
    dto: CreateTaskAttemptDto | UpdateTaskAttemptDto,
    isClassTask = false,
  ): Promise<UpsertTaskAttemptResponseDto> {
    // 1. Build attempt entity (no xp calc here)
    const attemptToSave = await this.buildTaskAttempt(
      existing,
      task,
      dto,
      isClassTask,
    );

    // 2. Save attempt (initial)
    const savedAttempt = await this.taskAttemptRepository.save(attemptToSave);

    // 3. Save/Sync answer logs first — REQUIRED before xp calc
    const answerLogs = (dto as any).answerLogs ?? [];
    await this.saveAnswerLogs(
      savedAttempt.task_attempt_id,
      answerLogs,
      !!existing,
    );

    // 4. If non-class and COMPLETED and all answered -> finalize points & xp
    if (
      !isClassTask &&
      savedAttempt.status === TaskAttemptStatus.COMPLETED &&
      savedAttempt.answered_question_count >= task.taskQuestions.length
    ) {
      await this.finalizePointsAndXp(savedAttempt, task);
    }

    // 5. For class task, possibly create TaskSubmission (SUBMITTED & all answered)
    if (isClassTask) {
      await this.maybeCreateSubmissionForClassTask(savedAttempt, task);
    }

    // 6. Activity logs (pass existing to indicate create vs update)
    await this.saveActivityLog(existing, savedAttempt);

    // 7. Return level change info (for client)
    const studentId =
      existing instanceof TaskAttempt
        ? existing.student_id
        : ((dto as CreateTaskAttemptDto).studentId ?? savedAttempt.student_id);

    const data = await this.getLevelChangeData(studentId, savedAttempt);

    return data;
  }

  // helper type guard
  private isCreateDto(dto: any): dto is CreateTaskAttemptDto {
    return (
      (dto as CreateTaskAttemptDto).taskId !== undefined ||
      (dto as CreateTaskAttemptDto).studentId !== undefined
    );
  }

  // ================================
  // CREATE / UPDATE (refactored to use persistAttemptAndLogs)
  // ================================
  async createTaskAttempt(
    dto: CreateTaskAttemptDto,
  ): Promise<DetailResponseDto<UpsertTaskAttemptResponseDto>> {
    const { taskId } = dto;

    const task = await this.getTaskWithQuestions(taskId);

    const data = await this.persistAttemptAndLogs(null, task, dto, false);

    return {
      status: 200,
      isSuccess: true,
      message: getResponseMessage({
        entity: 'task-attempt',
        action: 'create',
      }),
      data,
    };
  }

  async updateTaskAttempt(
    id: string,
    dto: UpdateTaskAttemptDto,
  ): Promise<DetailResponseDto<UpsertTaskAttemptResponseDto>> {
    const existing = await this.taskAttemptRepository.findOne({
      where: { task_attempt_id: id },
    });

    if (!existing) {
      throw new NotFoundException(`Task attempt with id ${id} not found`);
    }

    const task = await this.getTaskWithQuestions(existing.task_id);

    const data = await this.persistAttemptAndLogs(existing, task, dto, false);

    return {
      status: 200,
      isSuccess: true,
      message: getResponseMessage({
        entity: 'task-attempt',
        action: 'update',
      }),
      data,
    };
  }

  async createClassTaskAttempt(
    dto: CreateTaskAttemptDto,
  ): Promise<DetailResponseDto<UpsertTaskAttemptResponseDto>> {
    const { taskId } = dto;

    const task = await this.getTaskWithQuestions(taskId);

    const data = await this.persistAttemptAndLogs(null, task, dto, true);

    return {
      status: 200,
      isSuccess: true,
      message: getResponseMessage({
        entity: 'task-attempt',
        action: 'create',
      }),
      data,
    };
  }

  async updateClassTaskAttempt(
    id: string,
    dto: UpdateTaskAttemptDto,
  ): Promise<DetailResponseDto<UpsertTaskAttemptResponseDto>> {
    const existing = await this.taskAttemptRepository.findOne({
      where: { task_attempt_id: id },
    });

    if (!existing) {
      throw new NotFoundException(`Task attempt with id ${id} not found`);
    }

    const task = await this.getTaskWithQuestions(existing.task_id);

    const data = await this.persistAttemptAndLogs(existing, task, dto, true);

    return {
      status: 200,
      isSuccess: true,
      message: getResponseMessage({
        entity: 'task-attempt',
        action: 'update',
      }),
      data,
    };
  }

  // --------------------------
  // Activity log helper (kept as-is)
  // --------------------------
  private async saveActivityLog(
    existing: TaskAttempt | null,
    savedTaskAttempt: TaskAttempt,
  ) {
    const { status } = savedTaskAttempt;

    const taskAttemptWithRelations = await this.taskAttemptRepository.findOne({
      where: { task_attempt_id: savedTaskAttempt.task_attempt_id },
      relations: ['task', 'class', 'student'],
    });

    const data = taskAttemptWithRelations ?? savedTaskAttempt;

    switch (status) {
      case TaskAttemptStatus.ON_PROGRESS:
        if (existing === null) {
          await this.activityLogService.createActivityLog({
            userId: data.student_id,
            eventType: ActivityLogEventType.TASK_STARTED,
            description: getActivityLogDescription(
              ActivityLogEventType.TASK_STARTED,
              'task attempt',
              data,
            ),
            metadata: data,
          });
        } else {
          await this.activityLogService.createActivityLog({
            userId: data.student_id,
            eventType: ActivityLogEventType.TASK_LAST_ACCESSED,
            description: getActivityLogDescription(
              ActivityLogEventType.TASK_LAST_ACCESSED,
              'task attempt',
              data,
            ),
            metadata: data,
          });
        }
        break;
      case TaskAttemptStatus.SUBMITTED:
        await this.activityLogService.createActivityLog({
          userId: data.student_id,
          eventType: ActivityLogEventType.TASK_SUBMITTED,
          description: getActivityLogDescription(
            ActivityLogEventType.TASK_SUBMITTED,
            'task attempt',
            data,
            UserRole.STUDENT,
          ),
          metadata: data,
        });

        await this.activityLogService.createActivityLog({
          userId: data.class.teacher_id,
          eventType: ActivityLogEventType.TASK_SUBMITTED,
          description: getActivityLogDescription(
            ActivityLogEventType.TASK_SUBMITTED,
            'task attempt',
            data,
            UserRole.TEACHER,
          ),
          metadata: data,
        });
        break;
      case TaskAttemptStatus.COMPLETED:
        await this.activityLogService.createActivityLog({
          userId: data.student_id,
          eventType: ActivityLogEventType.TASK_COMPLETED,
          description: getActivityLogDescription(
            ActivityLogEventType.TASK_COMPLETED,
            'task attempt',
            data,
          ),
          metadata: data,
        });
        break;
      default:
        break;
    }
  }
}
