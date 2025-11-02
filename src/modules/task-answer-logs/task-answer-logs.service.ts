import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TaskAnswerLog } from './entities/task-answer-log.entity';
import { CreateTaskAnswerLogDto } from './dto/requests/create-task-answer-log.dto';
import { UpdateTaskAnswerLogDto } from './dto/requests/update-task-answer-log.dto';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { TaskQuestionOption } from '../task-question-options/entities/task-question-option.entity';

@Injectable()
export class TaskAnswerLogService {
  constructor(
    @InjectRepository(TaskAnswerLog)
    private readonly taskAnswerLogRepository: Repository<TaskAnswerLog>,
    @InjectRepository(TaskQuestionOption)
    private readonly taskQuestionOptionRepository: Repository<TaskQuestionOption>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  // 🔹 Helper: upload gambar jika ada
  private async handleImageUpload(
    imageFile: Express.Multer.File | undefined,
    answerLogId: string,
    taskAttemptId: string,
    oldImageUrl?: string,
  ): Promise<string> {
    if (!imageFile) return oldImageUrl || '';

    // Hapus gambar lama jika ada
    if (oldImageUrl) {
      await this.fileUploadService.deleteImage(oldImageUrl, 'task_answer_logs');
    }

    const fileDto = this.fileUploadService.convertMulterFileToDto(imageFile);
    const uploadResult = await this.fileUploadService.uploadImage(
      fileDto,
      answerLogId,
      'task_answer_logs',
      true,
      taskAttemptId,
    );

    return uploadResult.url;
  }

  // 🔹 Helper: isi nilai is_correct dari opsi soal
  private async resolveIsCorrect(optionId?: string): Promise<boolean> {
    if (!optionId) return false;
    const option = await this.taskQuestionOptionRepository.findOne({
      where: { task_question_option_id: optionId },
    });
    return option?.is_correct ?? false;
  }

  // 🔹 Helper: buat atau update satu log jawaban
  private async saveOrUpdateAnswerLog(
    taskAttemptId: string,
    dto: CreateTaskAnswerLogDto | UpdateTaskAnswerLogDto,
    existingLog?: TaskAnswerLog,
  ): Promise<TaskAnswerLog> {
    const isCorrect = await this.resolveIsCorrect(dto.optionId);

    let imageUrl = existingLog?.image || '';

    // Buat atau update entity
    const answerLog = this.taskAnswerLogRepository.create({
      ...existingLog,
      answer_text: dto.answerText,
      is_correct: isCorrect,
      task_attempt_id: taskAttemptId,
      question_id: dto.questionId,
      option_id: dto.optionId,
      created_at: existingLog ? existingLog.created_at : new Date(),
    });

    const saved = await this.taskAnswerLogRepository.save(answerLog);

    // Upload image jika ada
    imageUrl = await this.handleImageUpload(
      dto.imageFile,
      saved.task_answer_log_id,
      taskAttemptId,
      existingLog?.image,
    );

    // Update field image (jika berubah)
    if (imageUrl !== saved.image) {
      saved.image = imageUrl;
      await this.taskAnswerLogRepository.update(saved.task_answer_log_id, {
        image: imageUrl,
      });
    }

    return saved;
  }

  // ===============================
  // 📦 CREATE LOGS
  // ===============================
  async createTaskAnswerLogs(
    taskAttemptId: string,
    answerLogsDto: CreateTaskAnswerLogDto[],
  ): Promise<void> {
    if (!answerLogsDto?.length) return;
    const promises = answerLogsDto.map((dto) =>
      this.saveOrUpdateAnswerLog(taskAttemptId, dto),
    );
    await Promise.all(promises);
  }

  // ===============================
  // 🔄 SYNC LOGS
  // ===============================
  async syncTaskAnswerLogs(
    taskAttemptId: string,
    answerLogsDto: UpdateTaskAnswerLogDto[],
  ): Promise<void> {
    const existingLogs = await this.taskAnswerLogRepository.find({
      where: { task_attempt_id: taskAttemptId },
    });

    const existingIds = existingLogs.map((l) => l.task_answer_log_id);
    const incomingIds =
      answerLogsDto
        ?.filter((al) => !!al.answerLogId)
        .map((al) => al.answerLogId) || [];

    // 🔹 Hapus logs yang tidak ada di request
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await this.taskAnswerLogRepository.delete({
        task_answer_log_id: In(toDelete),
      });
    }

    // 🔹 Insert / update logs baru
    const promises = answerLogsDto.map((dto) => {
      if (!dto.optionId && !dto.answerText && !dto.imageFile) return;

      const existingLog = dto.answerLogId
        ? existingLogs.find((l) => l.task_answer_log_id === dto.answerLogId)
        : undefined;

      return this.saveOrUpdateAnswerLog(taskAttemptId, dto, existingLog);
    });

    await Promise.all(promises);
  }
}
