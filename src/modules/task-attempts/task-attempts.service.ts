import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  Raw,
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
  ) {}

  async findAllTaskAttemptsbyUser(
    userId: string,
    filterDto: FilterTaskAttemptDto,
  ): Promise<GroupedTaskAttemptResponseDto[]> {
    // Mulai dengan filter dasar: berdasarkan user
    const where: any = {
      student_id: userId,
    };

    // Tambahkan filter dinamis
    if (filterDto.status) {
      where.status = filterDto.status;
    }

    if (filterDto.dateFrom && filterDto.dateTo) {
      where.last_accessed_at = Between(filterDto.dateFrom, filterDto.dateTo);
    } else if (filterDto.dateFrom) {
      where.last_accessed_at = MoreThanOrEqual(filterDto.dateFrom);
    } else if (filterDto.dateTo) {
      where.last_accessed_at = LessThanOrEqual(filterDto.dateTo);
    }

    // Filter by search text (task name)
    if (filterDto.searchText) {
      where.task = {
        ...where.task,
        name: Raw((alias) => `${alias} ILIKE :name`, {
          name: `%${filterDto.searchText}%`,
        }),
      };
    }

    // Order dinamis
    const orderBy = filterDto.orderBy ?? 'last_accessed_at';
    const orderState = filterDto.orderState ?? 'DESC';

    // Query
    const attempts = await this.taskAttemptRepository.find({
      where,
      relations: {
        task: true,
      },
      order: {
        [orderBy]: orderState,
      },
    });

    // Error handling
    if (!attempts.length) {
      throw new NotFoundException(
        `No attempt found for user with id ${userId}`,
      );
    }

    // Mapping
    const groupByCompleted = filterDto.status?.toLowerCase() === 'completed';
    return this.mapAndGroupTaskAttempts(attempts, groupByCompleted);
  }

  private mapAndGroupTaskAttempts(
    attempts: TaskAttempt[],
    groupByCompleted: boolean,
  ): GroupedTaskAttemptResponseDto[] {
    const grouped = attempts.reduce(
      (acc, attempt) => {
        const { title, image } = attempt.task;
        const { task_attempt_id, status, last_accessed_at, completed_at } =
          attempt;

        // Pilih tanggal berdasarkan mode grouping
        const dateValue = groupByCompleted ? completed_at : last_accessed_at;
        if (!dateValue) return acc;

        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return acc;

        const dateKey = format(date, 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = {
            dateLabel: format(date, 'd MMM yyyy', { locale: id }),
            dayLabel: format(date, 'EEEE', { locale: id }),
            attempts: [],
          };
        }

        // Map langsung ke DTO kecil di sini
        acc[dateKey].attempts.push({
          id: task_attempt_id,
          title,
          image: image !== '' ? image : null,
          status,
          lastAccessedTime: getTime(last_accessed_at),
          completedTime: completed_at ? getTime(completed_at) : null,
        });

        return acc;
      },
      {} as Record<string, GroupedTaskAttemptResponseDto>,
    );

    return Object.values(grouped);
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

  // Helper: Hitung waktu selesai
  private getCompletedAt(
    questionCount: number,
    answeredQuestionCount: number,
  ): Date | null {
    // Jika semua atau lebih banyak soal sudah dijawab, anggap sudah selesai
    return answeredQuestionCount >= questionCount ? new Date() : null;
  }

  // Helper: Tentukan status
  private getStatus(
    answeredQuestionCount: number,
    completedAt: Date | null,
    isClassTask = false,
  ): TaskAttemptStatus {
    if (answeredQuestionCount === 0) return TaskAttemptStatus.NOT_STARTED;
    if (completedAt) {
      // kalau task dari class → SUBMITTED dulu, bukan langsung COMPLETED
      return isClassTask
        ? TaskAttemptStatus.SUBMITTED
        : TaskAttemptStatus.COMPLETED;
    }
    return TaskAttemptStatus.ON_PROGRESS;
  }

  // Helper: Ambil task + validasi
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
    // Ambil XP / Level info dari user
    const user = await this.userService.findUserBy('id', userId);

    // Default nilai aman
    let leveledUp = false;
    let levelChangeSummary = null;

    // Hitung perubahan level hanya jika XP ada (berarti task selesai)
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
      leveledUp,
      levelChangeSummary,
    };

    return data;
  }

  // Helper: Simpan atau update logs
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

  // Helper: Buat / update core attempt (dipakai di create & update)
  private async buildTaskAttempt(
    existing: TaskAttempt | null,
    task: Task,
    dto: CreateTaskAttemptDto | UpdateTaskAttemptDto,
    isClassTask = false, // ✅ tambahkan
  ): Promise<TaskAttempt> {
    const questionCount = task.taskQuestions.length;
    const { answeredQuestionCount, answerLogs } = dto;
    const completedAt = this.getCompletedAt(
      questionCount,
      answeredQuestionCount,
    );
    const status = this.getStatus(
      answeredQuestionCount,
      completedAt,
      isClassTask,
    );

    const attempt =
      existing ??
      this.taskAttemptRepository.create({
        ...(this.isCreateDto(dto) && { task_id: dto.taskId }),
        ...(this.isCreateDto(dto) && { student_id: dto.studentId }),
        started_at: existing ? existing.started_at : new Date(),
      });

    attempt.answered_question_count = answeredQuestionCount;
    attempt.status = status;
    attempt.last_accessed_at = new Date();
    attempt.completed_at = completedAt;

    // Update points dan xpGained saat semua soal sudah terisi
    if (answeredQuestionCount >= questionCount && !isClassTask) {
      const { points, xpGained } = answerLogs?.length
        ? await TaskXpHelper.calculatePointsAndXp(
            task,
            answerLogs,
            this.taskQuestionOptionRepository,
          )
        : { points: 0, xpGained: 0 };

      attempt.points = points;
      attempt.xp_gained = xpGained;

      // update level dan xp dari user
      const userId = existing.student_id;
      await this.userService.updateLevelAndXp(userId, xpGained);
    }

    return attempt;
  }

  // helper type guard
  private isCreateDto(dto: any): dto is CreateTaskAttemptDto {
    return (
      (dto as CreateTaskAttemptDto).taskId !== undefined ||
      (dto as CreateTaskAttemptDto).studentId !== undefined
    );
  }

  // ================================
  // 📦 CREATE TASK ATTEMPT
  // ================================
  async createTaskAttempt(
    dto: CreateTaskAttemptDto,
  ): Promise<DetailResponseDto<UpsertTaskAttemptResponseDto>> {
    const { taskId, answerLogs, studentId } = dto;

    const task = await this.getTaskWithQuestions(taskId);

    const taskAttempt = await this.buildTaskAttempt(null, task, dto);
    const savedTaskAttempt = await this.taskAttemptRepository.save(taskAttempt);

    const { task_attempt_id } = savedTaskAttempt;

    await this.saveAnswerLogs(task_attempt_id, answerLogs, false);

    const data: UpsertTaskAttemptResponseDto = await this.getLevelChangeData(
      studentId,
      savedTaskAttempt,
    );

    return {
      status: 200,
      isSuccess: true,
      message: 'Task attempt has been created!',
      data,
    };
  }

  // ================================
  // 🛠️ UPDATE TASK ATTEMPT
  // ================================
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

    const { task_id } = existing;

    const task = await this.getTaskWithQuestions(task_id);
    const updatedAttempt = await this.buildTaskAttempt(existing, task, dto);
    const savedTaskAttempt =
      await this.taskAttemptRepository.save(updatedAttempt);

    const { task_attempt_id, student_id: studentId } = savedTaskAttempt;
    const { answerLogs } = dto;

    await this.saveAnswerLogs(task_attempt_id, answerLogs, true);

    const data: UpsertTaskAttemptResponseDto = await this.getLevelChangeData(
      studentId,
      savedTaskAttempt,
    );

    return {
      status: 200,
      isSuccess: true,
      message: 'Task attempt has been updated!',
      data,
    };
  }

  /**
   * Create task attempt that is initiated in the dahsboard class page
   */
  async createClassTaskAttempt(
    dto: CreateTaskAttemptDto,
  ): Promise<DetailResponseDto<UpsertTaskAttemptResponseDto>> {
    const { taskId, answerLogs, studentId } = dto;

    const task = await this.getTaskWithQuestions(taskId);

    // create task attempt
    const taskAttempt = await this.buildTaskAttempt(null, task, dto, true);
    const savedTaskAttempt = await this.taskAttemptRepository.save(taskAttempt);

    const { task_attempt_id } = savedTaskAttempt;

    // create answer log
    await this.saveAnswerLogs(task_attempt_id, answerLogs, false);

    // create task submission if user han answered all questions
    if (
      savedTaskAttempt.answered_question_count === task.taskQuestions.length
    ) {
      await this.taskSubmissionService.createTaskSubmission({
        taskAttemptId: task_attempt_id,
      });
    }

    const data: UpsertTaskAttemptResponseDto = await this.getLevelChangeData(
      studentId,
      savedTaskAttempt,
    );

    return {
      status: 200,
      isSuccess: true,
      message: 'Task attempt has been created!',
      data,
    };
  }

  /**
   * Update task attempt that is initiated in the dahsboard class page
   */
  async updateClassTaskAttempt(
    id: string,
    dto: UpdateTaskAttemptDto,
  ): Promise<DetailResponseDto<UpsertTaskAttemptResponseDto>> {
    // get existing task attempt
    const existing = await this.taskAttemptRepository.findOne({
      where: { task_attempt_id: id },
    });

    if (!existing) {
      throw new NotFoundException(`Task attempt with id ${id} not found`);
    }

    // get task informations
    const { task_id } = existing;
    const task = await this.getTaskWithQuestions(task_id);

    // update task attempt
    const updatedAttempt = await this.buildTaskAttempt(
      existing,
      task,
      dto,
      true,
    );
    const savedTaskAttempt =
      await this.taskAttemptRepository.save(updatedAttempt);

    const { task_attempt_id, student_id: studentId } = savedTaskAttempt;
    const { answerLogs } = dto;

    // update answer log
    await this.saveAnswerLogs(task_attempt_id, answerLogs, true);

    // create task submission if user han answered all questions
    if (
      savedTaskAttempt.answered_question_count === task.taskQuestions.length
    ) {
      await this.taskSubmissionService.createTaskSubmission({
        taskAttemptId: task_attempt_id,
      });
    }

    const data: UpsertTaskAttemptResponseDto = await this.getLevelChangeData(
      studentId,
      savedTaskAttempt,
    );

    return {
      status: 200,
      isSuccess: true,
      message: 'Task attempt has been updated!',
      data,
    };
  }
}
