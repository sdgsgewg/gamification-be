import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { FilterTaskDto } from './dto/requests/filter-task.dto';
import { CreateTaskDto } from './dto/requests/create-task.dto';
import { UpdateTaskDto } from './dto/requests/update-task.dto';
import { TaskOverviewResponseDto } from './dto/responses/task-overview-response.dto';
import { TaskDetailResponseDto } from './dto/responses/task-detail-response.dto';
import { slugify } from '../../common/utils/slug.util';
import { DetailResponseDto } from 'src/common/responses/detail-response.dto';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import {
  getDateTime,
  getDateTimeWithName,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import { TaskGrade } from 'src/modules/task-grades/entities/task-grade.entity';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { SlugHelper } from 'src/common/helpers/slug.helper';
import { TaskQuestionService } from '../task-questions/task-questions.service';
import { getDbColumn } from 'src/common/database/get-db-column.util';
import { TaskDifficultyLabels } from './enums/task-difficulty.enum';
import { MasterHistoryService } from '../master-history/master-history.service';
import { MasterHistoryTransactionType } from '../master-history/enums/master-history-transaction-type';
import { getMasterHistoryDescription } from 'src/common/utils/get-master-history-description.util';
import { ClassTask } from '../class-tasks/entities/class-task.entity';
import { getResponseMessage } from 'src/common/utils/get-response-message.util';
import { TaskStatus } from './enums/task-status.enum';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskGrade)
    private readonly taskGradeRepository: Repository<TaskGrade>,
    private readonly taskQuestionService: TaskQuestionService,
    private readonly fileUploadService: FileUploadService,
    private readonly masterHistoryService: MasterHistoryService,
  ) {}

  async findAllTasks(
    userId: string,
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
        'task.is_published::boolean AS "isPublished"',
        'task.is_finalized::boolean AS "isFinalized"',
        'task.difficulty AS "difficulty"',
        'taskType.name AS "taskType"',
        'subject.name AS "subject"',
        'material.name AS "material"',
        `STRING_AGG(DISTINCT REPLACE(grade.name, 'Kelas ', ''), ', ') AS "taskGrade"`,
      ])
      .addSelect(
        'COUNT(DISTINCT taskQuestions.task_question_id)',
        'questionCount',
      )
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(DISTINCT ct.class_task_id)')
          .from(ClassTask, 'ct')
          .where('ct.task_id = task.task_id');
      }, 'assignedClassCount')
      .where('task.creator_id = :creatorId', {
        creatorId: userId,
      })
      .groupBy('task.task_id')
      .addGroupBy('task.title')
      .addGroupBy('task.difficulty')
      .addGroupBy('taskType.name')
      .addGroupBy('subject.name')
      .addGroupBy('material.name');

    // Filter
    if (filterDto.searchText) {
      qb.andWhere('task.title ILIKE :searchText', {
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
    if (filterDto.gradeIds?.length) {
      qb.andWhere('taskGrade.grade_id IN (:...gradeIds)', {
        gradeIds: filterDto.gradeIds,
      });
    }

    // Order by
    const orderBy = filterDto.orderBy ?? 'createdAt';
    const orderState = filterDto.orderState ?? 'DESC';
    const dbColumn = getDbColumn(Task, orderBy as keyof Task);
    qb.orderBy(`task.${dbColumn}`, orderState);

    const rawTasks = await qb.getRawMany();

    const taskOverviews: TaskOverviewResponseDto[] = rawTasks.map((t) => {
      // pastikan boolean
      const isFinalized = t.isFinalized === true || t.isFinalized === 'true';
      const isPublished = t.isPublished === true || t.isPublished === 'true';

      return {
        taskId: t.taskId,
        title: t.title,
        slug: t.slug,
        taskType: t.taskType,
        subject: t.subject,
        material: t.material,
        taskGrade: t.taskGrade || null,
        questionCount: Number(t.questionCount) || 0,
        difficulty: TaskDifficultyLabels[t.difficulty],
        assignedClassCount: Number(t.assignedClassCount) || 0,
        status: isFinalized
          ? TaskStatus.FINALIZED
          : isPublished
            ? TaskStatus.PUBLISHED
            : TaskStatus.DRAFT,
      };
    });

    return taskOverviews;
  }

  private getTaskDetailData(taskWithRelations: Task): TaskDetailResponseDto {
    const data: TaskDetailResponseDto = {
      id: taskWithRelations.task_id,
      taskDetail: {
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
              id: taskWithRelations.taskType.task_type_id,
              name: taskWithRelations.taskType.name,
              scope: taskWithRelations.taskType.scope,
            }
          : null,
        taskGradeIds: taskWithRelations.taskGrades
          ? taskWithRelations.taskGrades.map((tg) => tg.grade_id)
          : [],
        taskGrade:
          taskWithRelations.taskGrades &&
          taskWithRelations.taskGrades.length > 0
            ? taskWithRelations.taskGrades
                .map((tg) => tg.grade.name.replace('Kelas ', ''))
                .join(', ')
            : null,
        questionCount: taskWithRelations.taskQuestions.length,
        difficulty: TaskDifficultyLabels[taskWithRelations.difficulty],
        status: taskWithRelations.is_finalized
          ? TaskStatus.FINALIZED
          : taskWithRelations.is_published
            ? TaskStatus.PUBLISHED
            : TaskStatus.DRAFT,
      },
      duration: {
        startTime: taskWithRelations.start_time ?? null,
        endTime: taskWithRelations.end_time ?? null,
        duration: getTimePeriod(
          taskWithRelations.start_time,
          taskWithRelations.end_time,
        ),
      },
      history: {
        createdBy: `${getDateTimeWithName(taskWithRelations.created_at, taskWithRelations.created_by)}`,
        updatedBy: taskWithRelations.updated_by
          ? `${getDateTimeWithName(taskWithRelations.updated_at, taskWithRelations.updated_by)}`
          : null,
        publishedAt: taskWithRelations.published_at
          ? getDateTime(taskWithRelations.published_at)
          : null,
        finalizedAt: taskWithRelations.finalized_at
          ? getDateTime(taskWithRelations.finalized_at)
          : null,
      },
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
      .leftJoinAndSelect('task.classTasks', 'classTasks')
      .leftJoinAndSelect('classTasks.class', 'class')
      .leftJoinAndSelect('class.classStudents', 'classStudents')
      .leftJoinAndSelect(
        'taskQuestion.taskQuestionOptions',
        'taskQuestionOption',
      )
      .where('task.slug = :slug', { slug })
      .orderBy('taskQuestion.order', 'ASC')
      .addOrderBy('taskQuestionOption.order', 'ASC');

    const task = await qb.getOne();

    if (!task) {
      throw new NotFoundException(`Task with slug ${slug} not found`);
    }

    // Ambil jumlah submission per class
    const submissionStats = await this.taskRepository.manager
      .createQueryBuilder()
      .select('ct.class_id', 'classId')
      .addSelect('COUNT(ts.task_submission_id)', 'submissionCount')
      .addSelect(
        'COUNT(CASE WHEN ts.finish_graded_at IS NOT NULL THEN 1 END)',
        'gradedCount',
      )
      .from('class_tasks', 'ct')
      .innerJoin('task_attempts', 'ta', 'ta.class_id = ct.class_id')
      .innerJoin(
        'task_submissions',
        'ts',
        'ts.task_attempt_id = ta.task_attempt_id',
      )
      .where('ct.task_id = :taskId', { taskId: task.task_id })
      .groupBy('ct.class_id')
      .getRawMany();

    // Buat map untuk akses cepat
    const submissionMap = Object.fromEntries(
      submissionStats.map((row) => [
        row.classId,
        {
          submissionCount: Number(row.submissionCount),
          gradedCount: Number(row.gradedCount),
        },
      ]),
    );

    const taskDetail = this.getTaskDetailData(task);

    taskDetail.assignedClasses = task.classTasks.map((ct) => {
      const stat = submissionMap[ct.class.class_id] ?? {
        submissionCount: 0,
        gradedCount: 0,
      };

      return {
        id: ct.class.class_id,
        name: ct.class.name,
        slug: ct.class.slug,
        submissionCount: stat.submissionCount,
        totalStudents: ct.class.classStudents?.length ?? 0,
        gradedCount: stat.gradedCount,
        deadline: ct.end_time ? getDateTime(ct.end_time) : null,
      };
    });

    return taskDetail;
  }

  async createTask(
    userId: string,
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
      difficulty: dto.difficulty,
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

    // simpan ke task_questions (otomatis include options)
    if (dto.questions?.length > 0) {
      await this.taskQuestionService.createTaskQuestions(
        savedTask.task_id,
        dto.questions,
        dto.createdBy,
      );
    }

    // Add event to master history
    await this.masterHistoryService.createMasterHistory({
      tableName: 'tasks',
      pkName: 'task_id',
      pkValue: savedTask.task_id,
      transactionType: MasterHistoryTransactionType.INSERT,
      description: getMasterHistoryDescription(
        MasterHistoryTransactionType.INSERT,
        'task',
        undefined,
        savedTask,
      ),
      dataAfter: savedTask,
      createdBy: userId,
    });

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
      message: getResponseMessage({
        entity: 'task',
        action: 'create',
      }),
      data: taskDetail,
    };

    return response;
  }

  private async findTaskOrThrow(id: string) {
    const task = await this.taskRepository.findOne({
      where: { task_id: id },
      relations: ['creator'],
    });

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

  async updateTask(
    id: string,
    userId: string,
    dto: UpdateTaskDto,
    imageFile?: Express.Multer.File,
  ): Promise<DetailResponseDto<TaskDetailResponseDto>> {
    const existingTask = await this.findTaskOrThrow(id);

    if (existingTask.is_finalized)
      throw new BadRequestException('Finalized task cannot be edited.');

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
    existingTask.difficulty = dto.difficulty;
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
      await this.taskQuestionService.syncTaskQuestions(
        updatedTask.task_id,
        dto.questions,
        dto.updatedBy,
      );
    }

    // Add event to master history
    await this.masterHistoryService.createMasterHistory({
      tableName: 'tasks',
      pkName: 'task_id',
      pkValue: updatedTask.task_id,
      transactionType: MasterHistoryTransactionType.UPDATE,
      description: getMasterHistoryDescription(
        MasterHistoryTransactionType.UPDATE,
        'task',
        existingTask,
        updatedTask,
      ),
      dataBefore: existingTask,
      dataAfter: updatedTask,
      createdBy: userId,
    });

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
      message: getResponseMessage({
        entity: 'task',
        action: 'update',
      }),
      data: taskDetail,
    };

    return response;
  }

  async deleteTask(id: string, userId: string): Promise<BaseResponseDto> {
    // Cek tugas dulu
    const task = await this.findTaskOrThrow(id);

    // Add event to master history
    await this.masterHistoryService.createMasterHistory({
      tableName: 'tasks',
      pkName: 'task_id',
      pkValue: task.task_id,
      transactionType: MasterHistoryTransactionType.DELETE,
      description: getMasterHistoryDescription(
        MasterHistoryTransactionType.DELETE,
        'task',
        task,
        undefined,
      ),
      dataBefore: task,
      createdBy: userId,
    });

    // Hapus seluruh folder tasks/{taskId} dari storage (termasuk image task & question)
    await this.fileUploadService.deleteFolder('tasks', id);

    // Hapus data di task_questions (otomatis hapus options)
    await this.taskQuestionService.deleteTaskQuestion(id);

    // Hapus data di task_grades
    await this.taskGradeRepository.delete({ task_id: id });

    // Hapus task
    await this.taskRepository.delete(id);

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: getResponseMessage({
        entity: 'task',
        action: 'delete',
      }),
    };

    return response;
  }

  async publishTask(id: string, userId: string) {
    const existingTask = await this.findTaskOrThrow(id);

    if (existingTask.is_finalized)
      throw new BadRequestException(
        'Task has been finalized and cannot be republished.',
      );

    if (existingTask.is_published)
      throw new BadRequestException('Task is already published.');

    existingTask.is_published = true;
    existingTask.published_at = new Date();
    existingTask.updated_at = new Date();
    existingTask.updated_by = existingTask.creator.name;

    const updatedTask = await this.taskRepository.save(existingTask);

    // Add event to master history
    await this.masterHistoryService.createMasterHistory({
      tableName: 'tasks',
      pkName: 'task_id',
      pkValue: updatedTask.task_id,
      transactionType: MasterHistoryTransactionType.PUBLISH,
      description: getMasterHistoryDescription(
        MasterHistoryTransactionType.PUBLISH,
        'task',
        existingTask,
        undefined,
      ),
      dataBefore: existingTask,
      dataAfter: updatedTask,
      createdBy: userId,
    });

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: getResponseMessage({
        entity: 'task',
        action: 'publish',
      }),
    };

    return response;
  }

  async unpublishTask(id: string, userId: string) {
    const existingTask = await this.findTaskOrThrow(id);

    if (!existingTask.is_published)
      throw new BadRequestException('Task is not published.');

    if (existingTask.is_finalized)
      throw new BadRequestException('Finalized tasks cannot be unpublished.');

    existingTask.is_published = false;
    existingTask.published_at = null;
    existingTask.updated_at = new Date();
    existingTask.updated_by = existingTask.creator.name;

    const updatedTask = await this.taskRepository.save(existingTask);

    // Add event to master history
    await this.masterHistoryService.createMasterHistory({
      tableName: 'tasks',
      pkName: 'task_id',
      pkValue: updatedTask.task_id,
      transactionType: MasterHistoryTransactionType.UNPUBLISH,
      description: getMasterHistoryDescription(
        MasterHistoryTransactionType.UNPUBLISH,
        'task',
        existingTask,
        undefined,
      ),
      dataBefore: existingTask,
      dataAfter: updatedTask,
      createdBy: userId,
    });

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: getResponseMessage({
        entity: 'task',
        action: 'unpublish',
      }),
    };

    return response;
  }

  async finalizeTask(id: string, userId: string) {
    const existingTask = await this.findTaskOrThrow(id);

    if (!existingTask.is_published)
      throw new BadRequestException(
        'Task must be published before finalization.',
      );

    if (existingTask.is_finalized)
      throw new BadRequestException('Task is already finalized.');

    existingTask.is_finalized = true;
    existingTask.finalized_at = new Date();
    existingTask.updated_at = new Date();
    existingTask.updated_by = existingTask.creator.name;

    const updatedTask = await this.taskRepository.save(existingTask);

    // Add event to master history
    await this.masterHistoryService.createMasterHistory({
      tableName: 'tasks',
      pkName: 'task_id',
      pkValue: updatedTask.task_id,
      transactionType: MasterHistoryTransactionType.FINALIZE,
      description: getMasterHistoryDescription(
        MasterHistoryTransactionType.FINALIZE,
        'task',
        existingTask,
        undefined,
      ),
      dataBefore: existingTask,
      dataAfter: updatedTask,
      createdBy: userId,
    });

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: getResponseMessage({
        entity: 'task',
        action: 'finalize',
      }),
    };

    return response;
  }
}
