import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
  ) {}

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
  ): string {
    if (answeredQuestionCount === 0) return 'not_started';
    if (completedAt) return 'completed';
    return 'on_progress';
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

  // Helper: Hitung poin dan XP
  private async calculatePointsAndXp(
    task: Task,
    answerLogs: any[],
  ): Promise<{ points: number; xpGained: number }> {
    let points = 0;

    // Ambil semua optionId valid dari jawaban
    const optionIds = answerLogs
      .map((a) => a.optionId)
      .filter((id): id is string => !!id);

    // Ambil semua option terkait sekaligus (hindari N+1 query)
    const options = await this.taskQuestionOptionRepository.find({
      where: { task_question_option_id: In(optionIds) },
      relations: ['question'], // bisa ambil question sekaligus
    });

    // Buat map biar akses cepat
    const optionMap = new Map(
      options.map((opt) => [opt.task_question_option_id, opt]),
    );

    // Hitung poin
    for (const ans of answerLogs) {
      if (!ans.optionId) continue;
      const option = optionMap.get(ans.optionId);
      if (option?.is_correct && option.question) {
        points += option.question.point;
      }
    }

    // Kalikan dengan multiplier
    points *= task.taskType.point_multiplier ?? 1;

    // Hitung XP
    const questionCount = task.taskQuestions.length;
    const correctCount = options.filter((o) => o.is_correct).length;
    const accuracy = correctCount / questionCount;
    const baseXp = points * 1.2;
    const multiplier = task.taskType.point_multiplier ?? 1;
    const xpGained = Math.round(baseXp * accuracy * multiplier);

    return { points, xpGained };
  }

  private async getLevelChangeData(
    userId: string,
    savedTaskAttempt: TaskAttempt,
  ): Promise<UpsertTaskAttemptResponseDto> {
    // Ambil XP / Level info dari user
    const user = await this.userService.findUserBy('id', userId);

    // Hitung perubahan level
    let levelChange: ReturnType<typeof LevelHelper.getLevelChangeSummary> =
      null;
    if (user && savedTaskAttempt.xp_gained != null) {
      levelChange = LevelHelper.getLevelChangeSummary(
        user.level,
        user.xp,
        savedTaskAttempt.xp_gained,
      );
    }

    const data: UpsertTaskAttemptResponseDto = {
      leveledUp: levelChange.leveledUp ?? false,
      levelChangeSummary: levelChange ?? null,
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
  ): Promise<TaskAttempt> {
    const questionCount = task.taskQuestions.length;
    const { answeredQuestionCount, answerLogs } = dto;
    const completedAt = this.getCompletedAt(
      questionCount,
      answeredQuestionCount,
    );
    const status = this.getStatus(answeredQuestionCount, completedAt);

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
    if (answeredQuestionCount >= questionCount) {
      const { points, xpGained } = answerLogs?.length
        ? await this.calculatePointsAndXp(task, answerLogs)
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
      message: 'Percobaan tugas berhasil dibuat!',
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
      message: 'Percobaan tugas berhasil diperbarui!',
      data,
    };
  }
}
