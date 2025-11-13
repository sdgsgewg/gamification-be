import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskQuestion } from './entities/task-question.entity';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { UpdateTaskQuestionDto } from '../tasks/dto/requests/update-task.dto';
import { TaskQuestionOptionService } from '../task-question-options/task-question-options.service';
import { CreateTaskQuestionDto } from '../tasks/dto/requests/create-task.dto';

@Injectable()
export class TaskQuestionService {
  constructor(
    @InjectRepository(TaskQuestion)
    private readonly taskQuestionRepository: Repository<TaskQuestion>,
    private readonly taskQuestionOptionService: TaskQuestionOptionService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async findTaskQuestionsByTaskId(taskId: string) {
    const questions = await this.taskQuestionRepository.find({
      where: { task_id: taskId },
    });
    return questions;
  }

  async createTaskQuestions(
    taskId: string,
    questionsDto: CreateTaskQuestionDto[],
    createdBy: string,
  ): Promise<void> {
    const savedQuestions: TaskQuestion[] = [];

    for (const [idx, qDto] of questionsDto.entries()) {
      const index = idx + 1;
      let imageUrl = '';

      const newQuestion = this.taskQuestionRepository.create({
        text: qDto.text,
        type: qDto.type,
        point: qDto.point,
        image: imageUrl,
        time_limit: qDto.timeLimit,
        order: index,
        created_at: new Date(),
        created_by: createdBy,
        task_id: taskId,
      });

      const savedQ = await this.taskQuestionRepository.save(newQuestion);

      if (qDto.imageFile) {
        const fileDto = this.fileUploadService.convertMulterFileToDto(
          qDto.imageFile,
        );

        const uploadResult = await this.fileUploadService.uploadImage(
          fileDto,
          savedQ.task_question_id,
          'tasks',
          true,
          taskId,
          'questions',
        );

        imageUrl = uploadResult.url;
        await this.taskQuestionRepository.update(savedQ.task_question_id, {
          image: imageUrl,
        });
        savedQ.image = imageUrl;
      }

      // Insert options kalau ada
      if (qDto.options?.length > 0) {
        await this.taskQuestionOptionService.createTaskQuestionOptions(
          qDto.options,
          createdBy,
          savedQ.task_question_id,
        );
      }

      savedQuestions.push(savedQ);
    }
  }

  async syncTaskQuestions(
    taskId: string,
    questionsDto: UpdateTaskQuestionDto[],
    updatedBy: string,
  ) {
    const existingQuestions = await this.taskQuestionRepository.find({
      where: { task_id: taskId },
    });

    const existingQuestionIds = existingQuestions.map(
      (q) => q.task_question_id,
    );
    const incomingQuestionIds =
      questionsDto?.filter((q) => !!q.questionId).map((q) => q.questionId) ||
      [];

    // Hapus pertanyaan (beserta options) yang tidak ada di DTO
    const toDelete = existingQuestions.filter(
      (q) => !incomingQuestionIds.includes(q.task_question_id),
    );
    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map((q) => q.task_question_id);
      await this.taskQuestionOptionService.deleteTaskQuestionOption(
        idsToDelete,
      );
      await this.taskQuestionRepository.delete(idsToDelete);
    }

    // Insert / Update pertanyaan
    for (const [idx, qDto] of (questionsDto || []).entries()) {
      const index = idx + 1;
      if (qDto.questionId && existingQuestionIds.includes(qDto.questionId)) {
        // Update existing
        const question = existingQuestions.find(
          (q) => q.task_question_id === qDto.questionId,
        );

        if (qDto.imageFile) {
          // Hapus file lama kalau ada
          if (question.image) {
            await this.fileUploadService.deleteImage(question.image, 'tasks');
          }

          const fileDto = this.fileUploadService.convertMulterFileToDto(
            qDto.imageFile,
          );
          const uploadResult = await this.fileUploadService.uploadImage(
            fileDto,
            qDto.questionId,
            'tasks',
            true,
            taskId,
            'questions',
          );

          question.image = uploadResult.url;
        }

        question.text = qDto.text;
        question.type = qDto.type;
        question.point = qDto.point;
        question.time_limit = qDto.timeLimit;
        question.order = index;
        question.updated_at = new Date();
        question.updated_by = updatedBy ?? null;

        const savedQ = await this.taskQuestionRepository.save(question);

        // sync options
        await this.taskQuestionOptionService.syncTaskQuestionOptions(
          savedQ.task_question_id,
          qDto.options,
          updatedBy,
        );
      } else {
        let imageUrl = '';

        // Insert baru
        const newQuestion = this.taskQuestionRepository.create({
          text: qDto.text,
          type: qDto.type,
          point: qDto.point,
          image: imageUrl,
          time_limit: qDto.timeLimit,
          order: index,
          created_at: new Date(),
          created_by: updatedBy ?? null,
          task_id: taskId,
        });
        const savedQ = await this.taskQuestionRepository.save(newQuestion);

        // Upload image jika ada file
        if (qDto.imageFile) {
          const fileDto = this.fileUploadService.convertMulterFileToDto(
            qDto.imageFile,
          );

          const uploadResult = await this.fileUploadService.uploadImage(
            fileDto,
            savedQ.task_question_id,
            'tasks',
            true,
            taskId,
            'questions',
          );

          imageUrl = uploadResult.url;

          // update record question dengan URL
          await this.taskQuestionRepository.update(savedQ.task_question_id, {
            image: imageUrl,
          });
          savedQ.image = imageUrl;
        }

        // insert options baru
        if (qDto.options?.length > 0) {
          await this.taskQuestionOptionService.createTaskQuestionOptions(
            qDto.options,
            updatedBy,
            savedQ.task_question_id,
          );
        }
      }
    }
  }

  async deleteTaskQuestion(taskId: string): Promise<void> {
    const questions = await this.findTaskQuestionsByTaskId(taskId);
    const idsToDelete = questions.map((q) => q.task_question_id);

    // Hapus task question options
    await this.taskQuestionOptionService.deleteTaskQuestionOption(idsToDelete);

    // Hapus task questions
    await this.taskQuestionRepository.delete({ task_id: taskId });
  }
}
