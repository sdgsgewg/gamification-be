import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { FilterTaskDto } from './dto/requests/filter-task.dto';
import { CreateTaskDto } from './dto/requests/create-task.dto';
import {
  UpdateTaskDto,
  UpdateTaskQuestionDto,
  UpdateTaskQuestionOptionDto,
} from './dto/requests/update-task.dto';
import { TaskOverviewResponseDto } from './dto/responses/task-overview-response.dto';
import { TaskDetailResponseDto } from './dto/responses/task-detail-response.dto';
import { slugify } from '../../common/utils/slug.util';
import { DetailResponseDto } from 'src/common/responses/detail-response.dto';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import {
  getDateTime,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import { TaskGrade } from 'src/modules/task-grades/entities/task-grade.entity';
import { TaskQuestion } from 'src/modules/task-questions/entities/task-question.entity';
import { TaskQuestionOption } from 'src/modules/task-question-options/entities/task-question-option.entity';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { SlugHelper } from 'src/common/helpers/slug.helper';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskGrade)
    private readonly taskGradeRepository: Repository<TaskGrade>,
    @InjectRepository(TaskQuestion)
    private readonly taskQuestionRepository: Repository<TaskQuestion>,
    @InjectRepository(TaskQuestionOption)
    private readonly taskQuestionOptionRepository: Repository<TaskQuestionOption>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async findAllTasks(
    filterDto: FilterTaskDto,
  ): Promise<TaskOverviewResponseDto[]> {
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.subject', 'subject')
      .leftJoin('task.material', 'material')
      .leftJoin('task.taskType', 'taskType')
      .leftJoin('task.taskGrades', 'taskGrade')
      .leftJoin('taskGrade.grade', 'grade')
      .leftJoin('task.taskQuestions', 'taskQuestions')
      .select([
        'task.task_id AS "taskId"',
        'task.title AS "title"',
        'task.slug AS "slug"',
        'taskType.name AS "taskType"',
        'subject.name AS "subject"',
        'material.name AS "material"',
        `STRING_AGG(DISTINCT REPLACE(grade.name, 'Kelas ', ''), ', ') AS "taskGrade"`,
      ])
      .addSelect(
        'COUNT(DISTINCT taskQuestions.task_question_id)',
        'questionCount',
      )
      .groupBy('task.task_id')
      .addGroupBy('task.title')
      .addGroupBy('taskType.name')
      .addGroupBy('subject.name')
      .addGroupBy('material.name');

    if (filterDto.searchText) {
      qb.andWhere('task.title ILIKE :searchText ILIKE :searchText', {
        searchText: `%${filterDto.searchText}%`,
      });
    }

    if (filterDto.subjectId) {
      qb.andWhere('task.subject_id = :subjectId', {
        subjectId: filterDto.subjectId,
      });
    }

    if (filterDto.materialId) {
      qb.andWhere('task.material_id = :materialId', {
        materialId: filterDto.materialId,
      });
    }

    if (filterDto.taskTypeId) {
      qb.andWhere('task.task_type_id = :taskTypeId', {
        taskTypeId: filterDto.taskTypeId,
      });
    }

    if (filterDto.taskGradeIds && filterDto.taskGradeIds.length > 0) {
      qb.andWhere('taskGrade.grade_id IN (:...taskGradeIds)', {
        taskGradeIds: filterDto.taskGradeIds,
      });
    }

    const rawTasks = await qb.getRawMany();

    const taskOverviews: TaskOverviewResponseDto[] = rawTasks.map((t) => ({
      taskId: t.taskId,
      title: t.title,
      slug: t.slug,
      taskType: t.taskType,
      subject: t.subject,
      material: t.material,
      taskGrade: t.taskGrade || null,
      questionCount: Number(t.questionCount) || 0,
    }));

    return taskOverviews;
  }

  private getTaskDetailData(taskWithRelations: Task): TaskDetailResponseDto {
    const data: TaskDetailResponseDto = {
      taskId: taskWithRelations.task_id,
      title: taskWithRelations.title,
      slug: taskWithRelations.slug,
      description: taskWithRelations.description ?? null,
      image: taskWithRelations.image ?? null,
      subject: taskWithRelations.subject
        ? {
            subjectId: taskWithRelations.subject.subject_id,
            name: taskWithRelations.subject.name,
          }
        : null,
      material: taskWithRelations.material
        ? {
            materialId: taskWithRelations.material.material_id,
            name: taskWithRelations.material.name,
          }
        : null,
      taskType: taskWithRelations.taskType
        ? {
            taskTypeId: taskWithRelations.taskType.task_type_id,
            name: taskWithRelations.taskType.name,
          }
        : null,
      taskGradeIds: taskWithRelations.taskGrades
        ? taskWithRelations.taskGrades.map((tg) => tg.grade_id)
        : [],
      taskGrade:
        taskWithRelations.taskGrades && taskWithRelations.taskGrades.length > 0
          ? taskWithRelations.taskGrades
              .map((tg) => tg.grade.name.replace('Kelas ', ''))
              .join(', ')
          : null,
      questionCount: taskWithRelations.taskQuestions.length,
      startTime: taskWithRelations.start_time ?? null,
      endTime: taskWithRelations.end_time ?? null,
      duration: getTimePeriod(
        taskWithRelations.start_time,
        taskWithRelations.end_time,
      ),
      createdBy: `${getDateTime(taskWithRelations.created_at, taskWithRelations.created_by)}`,
      updatedBy: taskWithRelations.updated_by
        ? `${getDateTime(taskWithRelations.updated_at, taskWithRelations.updated_by)}`
        : null,
      questions:
        taskWithRelations.taskQuestions?.map((q) => ({
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

    return data;
  }

  async findTaskBySlug(slug: string): Promise<TaskDetailResponseDto> {
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.subject', 'subject')
      .leftJoinAndSelect('task.material', 'material')
      .leftJoinAndSelect('task.taskType', 'taskType')
      .leftJoinAndSelect('task.taskGrades', 'taskGrade')
      .leftJoinAndSelect('taskGrade.grade', 'grade')
      .leftJoinAndSelect('task.taskQuestions', 'taskQuestion')
      .leftJoinAndSelect(
        'taskQuestion.taskQuestionOptions',
        'taskQuestionOption',
      )
      .where('task.slug = :slug', { slug })
      .orderBy('grade.name', 'ASC');

    const task = await qb.getOne();

    if (!task) {
      throw new NotFoundException(`Task with slug ${slug} not found`);
    }

    const taskDetail = this.getTaskDetailData(task);

    return taskDetail;
  }

  async createTask(
    dto: CreateTaskDto,
    imageFile?: Express.Multer.File,
  ): Promise<DetailResponseDto<TaskDetailResponseDto>> {
    const slug = await SlugHelper.generateUniqueSlug(
      this.taskRepository,
      dto.title,
    );
    let imageUrl = '';

    // Buat task dulu (image kosong/null)
    const task = this.taskRepository.create({
      title: dto.title,
      slug,
      description: dto.description ?? '',
      image: imageUrl,
      start_time: dto.startTime ?? null,
      end_time: dto.endTime ?? null,
      created_at: new Date(),
      created_by: dto.createdBy,
      creator_id: dto.creatorId,
      subject_id: dto.subjectId,
      material_id: dto.materialId ?? null,
      task_type_id: dto.taskTypeId,
    });

    // Simpan ke tasks
    const savedTask = await this.taskRepository.save(task);

    // Upload image jika ada file
    if (imageFile) {
      const fileDto = this.fileUploadService.convertMulterFileToDto(imageFile);

      const uploadResult = await this.fileUploadService.uploadImage(
        fileDto,
        savedTask.task_id,
        'tasks',
        true,
        savedTask.task_id,
        'cover',
      );

      imageUrl = uploadResult.url;

      // update record task dengan URL
      await this.taskRepository.update(savedTask.task_id, { image: imageUrl });
      savedTask.image = imageUrl;
    }

    // Simpan ke task_grades
    if (dto.gradeIds && dto.gradeIds.length > 0) {
      const grades = dto.gradeIds.map((gradeId) =>
        this.taskGradeRepository.create({
          task_id: savedTask.task_id,
          grade_id: gradeId,
          created_at: new Date(),
        }),
      );
      await this.taskGradeRepository.save(grades);
    }

    // simpan ke task_questions
    let savedQuestions: TaskQuestion[] = [];
    if (dto.questions?.length > 0) {
      const questions = await Promise.all(
        dto.questions.map(async (q) => {
          let questionImageUrl = '';

          const question = this.taskQuestionRepository.create({
            text: q.text,
            type: q.type,
            point: q.point,
            image: questionImageUrl,
            time_limit: q.timeLimit,
            created_at: new Date(),
            created_by: dto.createdBy,
            task_id: savedTask.task_id,
          });

          // Simpan ke task_questions
          const savedQuestion =
            await this.taskQuestionOptionRepository.save(question);

          if (q.imageFile) {
            const fileDto = this.fileUploadService.convertMulterFileToDto(
              q.imageFile,
            );
            const uploadResult = await this.fileUploadService.uploadImage(
              fileDto,
              savedQuestion.task_question_id,
              'tasks',
              true,
              savedTask.task_id,
              'questions',
            );
            questionImageUrl = uploadResult.url;
          }

          return question;
        }),
      );

      savedQuestions = await this.taskQuestionRepository.save(questions);
    }

    // simpan ke task_question_options
    if (savedQuestions.length > 0) {
      // flatten semua options jadi 1 array
      const allOptions = savedQuestions.flatMap((question, index) => {
        const dtoOptions = dto.questions[index].options || [];
        return dtoOptions.map((o) =>
          this.taskQuestionOptionRepository.create({
            text: o.text,
            is_correct: o.isCorrect,
            created_at: new Date(),
            created_by: dto.createdBy,
            question_id: question.task_question_id,
          }),
        );
      });

      if (allOptions.length > 0) {
        await this.taskQuestionOptionRepository.save(allOptions);
      }
    }

    // Query ulang untuk ambil tabel relasinya
    const taskWithRelations = await this.taskRepository.findOne({
      where: { task_id: savedTask.task_id },
      relations: [
        'subject',
        'material',
        'taskType',
        'taskGrades',
        'taskGrades.grade',
        'taskQuestions',
        'taskQuestions.taskQuestionOptions',
      ],
    });

    const taskDetail = this.getTaskDetailData(taskWithRelations);

    const response: DetailResponseDto<TaskDetailResponseDto> = {
      status: 200,
      isSuccess: true,
      message: 'Task created successfully',
      data: taskDetail,
    };

    return response;
  }

  private async findTaskOrThrow(id: string) {
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.task_id = :id', { id });

    const task = await qb.getOne();

    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }

    return task;
  }

  private async syncTaskGrades(taskId: string, gradeIds: string[]) {
    const existingGrades = await this.taskGradeRepository.find({
      where: { task_id: taskId },
    });

    const existingGradeIds = existingGrades.map((g) => g.grade_id);
    const newGradeIds = gradeIds || [];

    // Hapus yang tidak ada di DTO
    const toDelete = existingGrades.filter(
      (g) => !newGradeIds.includes(g.grade_id),
    );
    if (toDelete.length > 0) {
      await this.taskGradeRepository.remove(toDelete);
    }

    // Tambah yang baru
    const toInsert = newGradeIds.filter((id) => !existingGradeIds.includes(id));
    if (toInsert.length > 0) {
      const newRecords = toInsert.map((gradeId) =>
        this.taskGradeRepository.create({ task_id: taskId, grade_id: gradeId }),
      );
      await this.taskGradeRepository.save(newRecords);
    }
  }

  private async syncTaskQuestionOptions(
    questionId: string,
    optionsDto: UpdateTaskQuestionOptionDto[],
    updatedBy?: string,
  ) {
    const existingOptions = await this.taskQuestionOptionRepository.find({
      where: { question_id: questionId },
    });

    const existingOptionIds = existingOptions.map(
      (o) => o.task_question_option_id,
    );
    const incomingOptionIds =
      optionsDto?.filter((o) => !!o.optionId).map((o) => o.optionId) || [];

    // Hapus yang tidak ada di DTO
    const toDelete = existingOptions.filter(
      (o) => !incomingOptionIds.includes(o.task_question_option_id),
    );
    if (toDelete.length > 0) {
      await this.taskQuestionOptionRepository.remove(toDelete);
    }

    // Insert / Update
    for (const oDto of optionsDto || []) {
      if (oDto.optionId && existingOptionIds.includes(oDto.optionId)) {
        // Update
        const option = existingOptions.find(
          (o) => o.task_question_option_id === oDto.optionId,
        );
        option.text = oDto.text;
        option.is_correct = oDto.isCorrect;
        option.updated_at = new Date();
        option.updated_by = updatedBy ?? null;
        await this.taskQuestionOptionRepository.save(option);
      } else {
        // Insert baru
        const newOption = this.taskQuestionOptionRepository.create({
          text: oDto.text,
          is_correct: oDto.isCorrect,
          created_at: new Date(),
          created_by: updatedBy ?? null,
          question_id: questionId,
        });
        await this.taskQuestionOptionRepository.save(newOption);
      }
    }
  }

  private async syncTaskQuestions(
    taskId: string,
    questionsDto: UpdateTaskQuestionDto[],
    updatedBy?: string,
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
      await this.taskQuestionOptionRepository.delete({
        question_id: In(idsToDelete),
      });
      await this.taskQuestionRepository.delete(idsToDelete);
    }

    // Insert / Update pertanyaan
    for (const qDto of questionsDto || []) {
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
        question.updated_at = new Date();
        question.updated_by = updatedBy ?? null;
        const savedQ = await this.taskQuestionRepository.save(question);

        // sync options
        await this.syncTaskQuestionOptions(
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
        }

        // insert options baru
        if (qDto.options?.length > 0) {
          const newOptions = qDto.options.map((o) =>
            this.taskQuestionOptionRepository.create({
              text: o.text,
              is_correct: o.isCorrect,
              created_at: new Date(),
              created_by: updatedBy ?? null,
              question_id: savedQ.task_question_id,
            }),
          );
          await this.taskQuestionOptionRepository.save(newOptions);
        }
      }
    }
  }

  async updateTask(
    id: string,
    dto: UpdateTaskDto,
    imageFile?: Express.Multer.File,
  ): Promise<DetailResponseDto<TaskDetailResponseDto>> {
    const existingTask = await this.findTaskOrThrow(id);

    let imageUrl = existingTask.image;

    // Jika ada file baru, upload dan hapus file lama jika ada
    if (imageFile) {
      // Hapus file lama jika ada
      if (existingTask.image) {
        await this.fileUploadService.deleteImage(existingTask.image, 'tasks');
      }

      // Convert Multer file to DTO
      const fileDto = this.fileUploadService.convertMulterFileToDto(imageFile);

      // Upload file baru
      const uploadResult = await this.fileUploadService.uploadImage(
        fileDto,
        existingTask.task_id,
        'tasks',
        true,
        existingTask.task_id,
        'cover',
      );

      imageUrl = uploadResult.url;
    }

    const slug = slugify(dto.title);

    existingTask.title = dto.title;
    existingTask.slug = slug;
    existingTask.description = dto.description;
    existingTask.image = imageUrl;
    existingTask.start_time = dto.startTime ?? null;
    existingTask.end_time = dto.endTime ?? null;
    existingTask.updated_at = new Date();
    existingTask.updated_by = dto.updatedBy ?? null;

    if (dto.subjectId) existingTask.subject_id = dto.subjectId;
    if (dto.materialId) existingTask.material_id = dto.materialId;
    if (dto.taskTypeId) existingTask.task_type_id = dto.taskTypeId;

    const updatedTask = await this.taskRepository.save(existingTask);

    // Sinkronisasi relasi
    if (dto.gradeIds) {
      await this.syncTaskGrades(updatedTask.task_id, dto.gradeIds);
    } else {
      await this.taskGradeRepository.delete({ task_id: updatedTask.task_id });
    }

    if (dto.questions) {
      await this.syncTaskQuestions(
        updatedTask.task_id,
        dto.questions,
        dto.updatedBy,
      );
    }

    // Reload with relations
    const taskWithRelations = await this.taskRepository.findOne({
      where: { task_id: updatedTask.task_id },
      relations: [
        'subject',
        'material',
        'taskType',
        'taskGrades',
        'taskGrades.grade',
        'taskQuestions',
        'taskQuestions.taskQuestionOptions',
      ],
    });

    const taskDetail = this.getTaskDetailData(taskWithRelations);

    const response: DetailResponseDto<TaskDetailResponseDto> = {
      status: 200,
      isSuccess: true,
      message: 'Task updated successfully',
      data: taskDetail,
    };

    return response;
  }

  async deleteTask(id: string): Promise<BaseResponseDto> {
    // Cek tugas dulu
    await this.findTaskOrThrow(id);

    // Hapus seluruh folder tasks/{taskId} dari storage (termasuk image task & question)
    await this.fileUploadService.deleteFolder('tasks', id);

    // Hapus data di task_question_options
    const questions = await this.taskQuestionRepository.find({
      where: { task_id: id },
    });
    await this.taskQuestionOptionRepository.delete({
      question_id: In(questions.map((q) => q.task_question_id)),
    });

    // Hapus data di task_questions
    await this.taskQuestionRepository.delete({ task_id: id });

    // Hapus data di task_grades
    await this.taskGradeRepository.delete({ task_id: id });

    // Hapus task
    await this.taskRepository.delete(id);

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: 'Task deleted successfully',
    };

    return response;
  }
}
