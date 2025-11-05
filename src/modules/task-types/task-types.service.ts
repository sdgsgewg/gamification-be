import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskType } from './entities/task-type.entity';
import { FilterTaskTypeDto } from './dto/requests/filter-task-type.dto';
import { CreateTaskTypeDto } from './dto/requests/create-task-type.dto';
import { UpdateTaskTypeDto } from './dto/requests/update-task-type.dto';
import { TaskTypeOverviewResponseDto } from './dto/responses/task-type-overview-response.dto';
import { TaskTypeDetailResponseDto } from './dto/responses/task-type-detail-response.dto';
import { capitalizeFirstLowerRest } from 'src/common/utils/string-modifier.util';
import { DetailResponseDto } from 'src/common/responses/detail-response.dto';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { getDateTimeWithName } from 'src/common/utils/date-modifier.util';
import { slugify } from 'src/common/utils/slug.util';
import { SlugHelper } from 'src/common/helpers/slug.helper';
import { getDbColumn } from 'src/common/database/get-db-column.util';

@Injectable()
export class TaskTypeService {
  constructor(
    @InjectRepository(TaskType)
    private readonly taskTypeRepository: Repository<TaskType>,
  ) {}

  async findAllTaskTypes(
    filterDto: FilterTaskTypeDto,
  ): Promise<TaskTypeOverviewResponseDto[]> {
    const qb = this.taskTypeRepository.createQueryBuilder('taskType');

    // filter
    if (filterDto.searchText) {
      qb.andWhere('taskType.name ILIKE :searchText', {
        searchText: `%${filterDto.searchText}%`,
      });
    }

    if (filterDto.scope) {
      qb.andWhere('taskType.scope = :scope', {
        scope: filterDto.scope,
      });
    }

    if (filterDto.hasDeadline) {
      qb.andWhere('taskType.has_deadline = :hasDeadline', {
        hasDeadline: filterDto.hasDeadline === 'true' ? true : false,
      });
    }

    if (filterDto.isCompetitive) {
      qb.andWhere('taskType.is_competitive = :isCompetitive', {
        isCompetitive: filterDto.isCompetitive === 'true' ? true : false,
      });
    }

    if (filterDto.isRepeatable) {
      qb.andWhere('taskType.is_repeatable = :isRepeatable', {
        isRepeatable: filterDto.isRepeatable === 'true' ? true : false,
      });
    }

    // order by
    const orderBy = filterDto.orderBy ?? 'createdAt';
    const orderState = filterDto.orderState ?? 'DESC';

    // otomatis mapping property → nama kolom DB, fallback ke created_at
    const dbColumn = getDbColumn(TaskType, orderBy as keyof TaskType);

    qb.orderBy(`taskType.${dbColumn}`, orderState);

    const rawTaskTypes = await qb.getMany();

    const taskTypeOverviews: TaskTypeOverviewResponseDto[] = rawTaskTypes.map(
      (tt) => ({
        taskTypeId: tt.task_type_id,
        name: tt.name,
        slug: tt.slug,
        scope: capitalizeFirstLowerRest(tt.scope),
        hasDeadline: tt.has_deadline,
        isRepeatable: tt.is_repeatable,
      }),
    );

    return taskTypeOverviews;
  }

  private getTaskTypeDetailData(taskType: TaskType): TaskTypeDetailResponseDto {
    const data: TaskTypeDetailResponseDto = {
      taskTypeId: taskType.task_type_id,
      name: taskType.name,
      slug: taskType.slug,
      description: taskType.description,
      scope: capitalizeFirstLowerRest(taskType.scope),
      hasDeadline: taskType.has_deadline,
      isRepeatable: taskType.is_repeatable,
      createdBy: `${getDateTimeWithName(taskType.created_at, taskType.created_by)}`,
      updatedBy: taskType.updated_by
        ? `${getDateTimeWithName(taskType.updated_at, taskType.updated_by)}`
        : null,
    };

    return data;
  }

  async findTaskTypeBySlug(slug: string): Promise<TaskTypeDetailResponseDto> {
    const qb = this.taskTypeRepository
      .createQueryBuilder('taskType')
      .where('taskType.slug = :slug', { slug });

    const taskType = await qb.getOne();

    if (!taskType) {
      throw new NotFoundException(`Task type with slug ${slug} not found`);
    }

    const taskTypeDetail = this.getTaskTypeDetailData(taskType);

    return taskTypeDetail;
  }

  async createTaskType(
    dto: CreateTaskTypeDto,
  ): Promise<DetailResponseDto<TaskTypeDetailResponseDto>> {
    const slug = slugify(dto.name);

    // Cek apakah slug duplicate
    const isDuplicate = await SlugHelper.checkDuplicateSlug(
      this.taskTypeRepository,
      slug,
      'task_type_id',
    );

    if (isDuplicate) {
      return new DetailResponseDto<TaskTypeDetailResponseDto>(
        400,
        false,
        `Tipe tugas dengan nama "${dto.name}" sudah terdaftar`,
      );
    }

    const taskType = this.taskTypeRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      scope: dto.scope,
      has_deadline: dto.hasDeadline === 'true' ? true : false,
      is_repeatable: dto.isRepeatable === 'true' ? true : false,
      created_at: new Date(),
      created_by: dto.createdBy ?? null,
    });

    const saved = await this.taskTypeRepository.save(taskType);

    const taskTypeDetail = this.getTaskTypeDetailData(saved);

    const response: DetailResponseDto<TaskTypeDetailResponseDto> = {
      status: 200,
      isSuccess: true,
      message: 'Tipe tugas berhasil dibuat!',
      data: taskTypeDetail,
    };

    return response;
  }

  private async findTaskTypeOrThrow(id: string) {
    const qb = this.taskTypeRepository
      .createQueryBuilder('taskType')
      .where('taskType.task_type_id = :id', { id });

    const taskType = await qb.getOne();

    if (!taskType) {
      throw new NotFoundException(`Task type with id ${id} not found`);
    }

    return taskType;
  }

  async updateTaskType(
    id: string,
    dto: UpdateTaskTypeDto,
  ): Promise<DetailResponseDto<TaskTypeDetailResponseDto>> {
    // Cari tipe task yang akan diupdate
    const existingTaskType = await this.findTaskTypeOrThrow(id);

    const slug = slugify(dto.name);

    // Cek apakah slug duplicate
    const isDuplicate = await SlugHelper.checkDuplicateSlug(
      this.taskTypeRepository,
      slug,
      'task_type_id',
      id,
    );

    if (isDuplicate) {
      return new DetailResponseDto<TaskTypeDetailResponseDto>(
        400,
        false,
        `Tipe tugas dengan nama "${dto.name}" sudah terdaftar`,
      );
    }

    // Update properti yang ada
    existingTaskType.name = dto.name;
    existingTaskType.slug = slug;
    existingTaskType.description = dto.description ?? null;
    existingTaskType.scope = dto.scope;
    existingTaskType.has_deadline = dto.hasDeadline === 'true' ? true : false;
    existingTaskType.is_repeatable = dto.isRepeatable === 'true' ? true : false;
    existingTaskType.updated_at = new Date();
    existingTaskType.updated_by = dto.updatedBy;

    // Simpan perubahan utama tipe task
    const updatedTaskType =
      await this.taskTypeRepository.save(existingTaskType);

    const taskTypeDetail = this.getTaskTypeDetailData(updatedTaskType);

    const response: DetailResponseDto<TaskTypeDetailResponseDto> = {
      status: 200,
      isSuccess: true,
      message: 'Tipe tugas berhasil diperbarui!',
      data: taskTypeDetail,
    };

    return response;
  }

  async deleteTaskType(id: string): Promise<BaseResponseDto> {
    // cek tipe task dulu
    await this.findTaskTypeOrThrow(id);

    await this.taskTypeRepository.delete(id);

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: 'Tipe tugas berhasil dihapus!',
    };

    return response;
  }
}
