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
  In,
} from 'typeorm';
import { TaskAttempt } from './entities/task-attempt.entity';
import { CreateTaskAttemptDto } from './dto/requests/create-task-attempt.dto';
import { UpdateTaskAttemptDto } from './dto/requests/update-task-attempt.dto';
import { TaskAnswerLogService } from '../task-answer-logs/task-answer-logs.service';
import { Task } from '../tasks/entities/task.entity';
import { UserService } from '../users/users.service';
import { DetailResponseDto } from 'src/common/responses/detail-response.dto';
import { UpsertTaskAttemptResponseDto } from './dto/responses/upsert-task-attempt.dto';
import { LevelHelper } from 'src/common/helpers/level.helper';
import {
  getDateTime,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import { FilterTaskAttemptDto } from './dto/requests/filter-task-attempt.dto';
import { GroupedTaskAttemptResponseDto } from './dto/responses/grouped-task-attempt.dto';
import { TaskAttemptStatus } from './enums/task-attempt-status.enum';
import { TaskSubmissionService } from '../task-submissions/task-submissions.service';
import { TaskXpHelper } from 'src/common/helpers/task-xp.helper';
import { ActivityLogService } from '../activty-logs/activity-logs.service';
import { getActivityLogDescription } from 'src/common/utils/get-activity-log-description.util';
import { ActivityLogEventType } from '../activty-logs/enums/activity-log-event-type';
import { UserRole } from '../roles/enums/user-role.enum';
import { getResponseMessage } from 'src/common/utils/get-response-message.util';
import { MostPopularTaskResponseDto } from './dto/responses/most-popular-task-response.dto';
import { CurrentAttemptResponseDto } from './dto/responses/current-attempt-response.dto';
import { AttemptMetaResponseDto } from './dto/responses/attempt-meta-response.dto';
import { ClassTaskStudentAttemptResponseDto } from './dto/responses/student-attempt/class-task-student-attempt-response.dto';
import { ClassTaskAttemptResponseDto } from './dto/responses/student-attempt/class-task-attempt-response.dto';
import { Class } from '../classes/entities/class.entity';
import { ClassTask } from '../class-tasks/entities/class-task.entity';
import { ActivityTaskAttemptResponseDto } from './dto/responses/student-attempt/activity-task-attempt-response.dto';
import { TaskAttemptResponseMapper } from './mapper/task-attempt-response.mapper';
import { ActivityTaskStudentAttemptResponseDto } from './dto/responses/student-attempt/activity-task-student-attempt-response.dto';
import { TaskAttemptHelper } from 'src/common/helpers/task-attempt.helper';

@Injectable()
export class TaskAttemptService {
  constructor(
    @InjectRepository(TaskAttempt)
    private readonly taskAttemptRepository: Repository<TaskAttempt>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(ClassTask)
    private readonly classTaskRepository: Repository<ClassTask>,
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

    return TaskAttemptResponseMapper.mapAndGroupTaskAttempts(attempts);
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

  // -------------------------------------------------
  // Return all attempts from each teacher's classes
  // -------------------------------------------------
  async findAllTaskAttemptsFromClasses(
    teacherId: string,
  ): Promise<ClassTaskAttemptResponseDto[]> {
    const classes = await this.classRepository.find({
      where: { teacher_id: teacherId },
      relations: { classStudents: true },
    });

    if (!classes.length) {
      throw new NotFoundException('No class found for this teacher');
    }

    const classIds = classes.map((c) => c.class_id);

    const classTasks = await this.classTaskRepository.find({
      where: { class: { class_id: In(classIds) } },
      relations: {
        class: { classStudents: true },
        task: { taskType: true },
      },
    });

    if (!classTasks.length) return [];

    const attempts = await this.taskAttemptRepository
      .createQueryBuilder('ta')
      .leftJoinAndSelect('ta.task', 't')
      .leftJoinAndSelect('ta.class', 'c')
      .where('ta.class_id IN (:...classIds)', { classIds })
      .getMany();

    return TaskAttemptResponseMapper.mapClassTaskAttempts(classTasks, attempts);
  }

  // --------------------------
  // Return all attempts from activity page
  // --------------------------
  async findAllTaskAttemptsFromActivityPage(
    teacherId: string,
  ): Promise<ActivityTaskAttemptResponseDto[]> {
    const tasks = await this.taskRepository.find({
      where: { creator_id: teacherId },
      relations: { taskType: true },
    });

    if (!tasks.length) {
      throw new NotFoundException('No task found for this teacher');
    }

    const attempts = await this.taskAttemptRepository
      .createQueryBuilder('ta')
      .leftJoinAndSelect('ta.task', 't')
      .where('ta.class_id IS NULL')
      .andWhere('t.creator_id = :teacherId', { teacherId })
      .getMany();

    if (!attempts.length) return [];

    return TaskAttemptResponseMapper.mapActivityTaskAttempts(tasks, attempts);
  }

  // --------------------------
  // Return student attempts from a task in a class
  // --------------------------
  async findStudentAttemptsFromClassTask(
    classSlug: string,
    taskSlug: string,
  ): Promise<ClassTaskStudentAttemptResponseDto> {
    // Validasi class-task
    const classTask = await this.classTaskRepository.findOne({
      where: {
        class: { slug: classSlug },
        task: { slug: taskSlug },
      },
      relations: {
        class: true,
        task: true,
      },
    });

    if (!classTask) {
      throw new NotFoundException('Task not found in this class');
    }

    // Ambil semua attempt
    const attempts = await this.taskAttemptRepository
      .createQueryBuilder('ta')
      .leftJoinAndSelect('ta.student', 's')
      .leftJoinAndSelect('ta.taskSubmission', 'ts')
      .where('ta.class_id = :classId', {
        classId: classTask.class_id,
      })
      .andWhere('ta.task_id = :taskId', {
        taskId: classTask.task_id,
      })
      .orderBy('ta.started_at', 'ASC')
      .getMany();

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

    return TaskAttemptResponseMapper.mapStudentAttemptsFromClassTask(
      classTask,
      attempts,
    );
  }

  // --------------------------
  // Return student attempts from a task on activity page
  // --------------------------
  async findStudentAttemptsFromActivityTask(
    taskSlug: string,
  ): Promise<ActivityTaskStudentAttemptResponseDto> {
    const task = await this.taskRepository.findOne({
      where: { slug: taskSlug },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const attempts = await this.taskAttemptRepository
      .createQueryBuilder('ta')
      .leftJoinAndSelect('ta.student', 's')
      .leftJoinAndSelect('ta.taskSubmission', 'ts')
      .andWhere('ta.task_id = :taskId', { taskId: task.task_id })
      .orderBy('ta.started_at', 'ASC')
      .getMany();

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

    return TaskAttemptResponseMapper.mapStudentAttemptsFromActivityTask(
      task,
      attempts,
    );
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

    return TaskAttemptResponseMapper.mapTaskAttemptDetail(attempt);
  }

  async getAttemptMeta({
    userId,
    taskId,
    classId,
  }: {
    userId: string;
    taskId: string;
    classId?: string | null;
  }): Promise<AttemptMetaResponseDto> {
    let currAttemptMeta: CurrentAttemptResponseDto = {
      answeredCount: 0,
      startedAt: null,
      lastAccessedAt: null,
      status: TaskAttemptStatus.NOT_STARTED,
    };

    const currAttempt = await this.taskAttemptRepository.findOne({
      where: {
        student_id: userId,
        task_id: taskId,
        class_id: classId ?? IsNull(),
        status: TaskAttemptStatus.ON_PROGRESS,
      },
      order: { last_accessed_at: 'DESC' },
    });

    if (currAttempt) {
      currAttemptMeta = {
        answeredCount: currAttempt.answered_question_count ?? 0,
        startedAt: getDateTime(currAttempt.started_at),
        lastAccessedAt: getDateTime(currAttempt.last_accessed_at),
        status: currAttempt.status,
      };
    }

    const recentAttempts = await this.taskAttemptRepository.find({
      where: {
        student_id: userId,
        task_id: taskId,
        class_id: classId ?? IsNull(),
        status: In([
          TaskAttemptStatus.SUBMITTED,
          TaskAttemptStatus.COMPLETED,
          TaskAttemptStatus.PAST_DUE,
        ]),
      },
      relations: { taskSubmission: true },
      order: { completed_at: 'DESC' },
    });

    return {
      current: currAttemptMeta,
      recent: recentAttempts.map((a) => ({
        id: a.task_attempt_id,
        startedAt: a.started_at ? getDateTime(a.started_at) : null,
        submittedAt: a.taskSubmission
          ? getDateTime(a.taskSubmission.created_at)
          : null,
        completedAt: a.completed_at ? getDateTime(a.completed_at) : null,
        duration:
          a.taskSubmission && a.started_at
            ? getTimePeriod(a.started_at, a.taskSubmission.created_at)
            : null,
        status: a.status,
      })),
    };
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

  // --------------------------------------------------------------
  // buildTaskAttempt (SIMPLIFIED) - no xp/points computation here
  // --------------------------------------------------------------
  private async buildTaskAttempt(
    existing: TaskAttempt | null,
    task: Task,
    dto: CreateTaskAttemptDto | UpdateTaskAttemptDto,
    isClassTask = false,
  ): Promise<TaskAttempt> {
    const questionCount = task.taskQuestions.length;
    const { answeredQuestionCount } = dto;
    const completedAt = TaskAttemptHelper.getCompletedAt(
      questionCount,
      answeredQuestionCount,
      isClassTask,
    );

    const attempt =
      existing ??
      this.taskAttemptRepository.create({
        ...(TaskAttemptHelper.isCreateDto(dto) && { task_id: dto.taskId }),
        ...(TaskAttemptHelper.isCreateDto(dto) && {
          student_id: dto.studentId,
        }),
        ...(TaskAttemptHelper.isCreateDto(dto) &&
          isClassTask && { class_id: dto.classId }),
        ...(TaskAttemptHelper.isCreateDto(dto) && {
          started_at: dto.startedAt,
        }),
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
  // HELPER: finalizePointsAndXp
  // - fetch saved answer logs
  // - call TaskXpHelper
  // - update attempt.points & attempt.xp_gained
  // - update user xp via userService.updateLevelAndXp
  // --------------------------
  private async finalizePointsAndXp(
    savedAttempt: TaskAttempt,
    task: Task,
  ): Promise<TaskAttempt> {
    // Ambil semua answer logs
    const savedLogs = await this.taskAnswerLogService.findAllByAttemptId(
      savedAttempt.task_attempt_id,
    );

    if (!savedLogs || savedLogs.length === 0) return savedAttempt;

    // Ambil previous COMPLETED attempts utk task ini oleh student ini
    const previousAttempts = await this.taskAttemptRepository.find({
      where: {
        task_id: savedAttempt.task_id,
        student_id: savedAttempt.student_id,
      },
      select: ['task_attempt_id', 'status', 'xp_gained'],
    });

    // Hitung points SELALU
    const { points, xpGained } = await TaskXpHelper.calculatePointsAndXp(
      task,
      savedLogs,
    );

    savedAttempt.points = points;

    // Tentukan apakah XP boleh diberikan
    const shouldGrantXp = TaskXpHelper.shouldGrantXp(previousAttempts);

    savedAttempt.xp_gained = shouldGrantXp ? xpGained : null;

    await this.taskAttemptRepository.save(savedAttempt);

    return savedAttempt;
  }

  // --------------------------
  // HELPER: maybeCreateSubmissionForClassTask
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

  // ---------------------------------
  // Activity log helper (kept as-is)
  // ---------------------------------
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
