import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { FilterSubjectDto } from './dto/requests/filter-subject.dto';
import { CreateSubjectDto } from './dto/requests/create-subject.dto';
import { UpdateSubjectDto } from './dto/requests/update-subject.dto';
import { SubjectOverviewResponseDto } from './dto/responses/subject-overview-response.dto';
import { SubjectDetailResponseDto } from './dto/responses/subject-detail-reponse.dto';
import { getDateTimeWithName } from 'src/common/utils/date-modifier.util';
import { DetailResponseDto } from 'src/common/responses/detail-response.dto';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { getDbColumn } from 'src/common/database/get-db-column.util';
import { slugify } from 'src/common/utils/slug.util';
import { SlugHelper } from 'src/common/helpers/slug.helper';
import { TaskTypeScope } from '../task-types/enums/task-type-scope.enum';

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async findAllSubjects(
    filterDto: FilterSubjectDto,
  ): Promise<SubjectOverviewResponseDto[]> {
    const qb = this.subjectRepository
      .createQueryBuilder('subject')
      .leftJoin('subject.tasks', 'tasks')
      .leftJoin('tasks.taskType', 'taskType')
      .select([
        'subject.subject_id AS "subjectId"',
        'subject.name AS "name"',
        'subject.slug AS "slug"',
        'subject.image AS "image"',
      ])
      .addSelect(
        `
      COUNT(
        DISTINCT CASE
          WHEN taskType.scope IN (:...scopes)
          THEN tasks.task_id
        END
      )
    `,
        'activityCount',
      )
      .setParameter('scopes', [TaskTypeScope.ACTIVITY, TaskTypeScope.GLOBAL])
      .groupBy('subject.subject_id')
      .addGroupBy('subject.name')
      .addGroupBy('subject.slug');

    // filter
    if (filterDto.searchText) {
      qb.andWhere('subject.name ILIKE :searchText', {
        searchText: `%${filterDto.searchText}%`,
      });
    }

    // order by
    const orderBy = filterDto.orderBy ?? 'createdAt';
    const orderState = filterDto.orderState ?? 'DESC';

    // otomatis mapping property → nama kolom DB, fallback ke created_at
    const dbColumn = getDbColumn(Subject, orderBy as keyof Subject);

    qb.orderBy(`subject.${dbColumn}`, orderState);

    const rawSubjects = await qb.getRawMany();

    const subjectOverviews: SubjectOverviewResponseDto[] = rawSubjects.map(
      (s) => ({
        subjectId: s.subjectId,
        name: s.name,
        slug: s.slug,
        image: s.image !== '' ? s.image : null,
        activityCount: Number(s.activityCount) || 0,
      }),
    );

    return subjectOverviews;
  }

  private getSubjectDetailData(subject: Subject): SubjectDetailResponseDto {
    const data: SubjectDetailResponseDto = {
      subjectId: subject.subject_id,
      name: subject.name,
      slug: subject.slug,
      description: subject.description ?? null,
      image: subject.image ?? null,
      createdBy: `${getDateTimeWithName(subject.created_at, subject.created_by)}`,
      updatedBy: subject.updated_by
        ? `${getDateTimeWithName(subject.updated_at, subject.updated_by)}`
        : null,
    };

    return data;
  }

  async findSubjectBySlug(slug: string): Promise<SubjectDetailResponseDto> {
    const qb = this.subjectRepository
      .createQueryBuilder('subject')
      .where('subject.slug = :slug', { slug });

    const subject = await qb.getOne();

    if (!subject) {
      throw new NotFoundException(`Subject with slug ${slug} not found`);
    }

    const subjectDetail = this.getSubjectDetailData(subject);

    return subjectDetail;
  }

  async createSubject(
    dto: CreateSubjectDto,
    imageFile?: Express.Multer.File,
  ): Promise<DetailResponseDto<SubjectDetailResponseDto>> {
    const slug = slugify(dto.name);

    // Cek apakah slug duplicate
    const isDuplicate = await SlugHelper.checkDuplicateSlug(
      this.subjectRepository,
      slug,
      'subject_id',
    );

    if (isDuplicate) {
      return new DetailResponseDto<SubjectDetailResponseDto>(
        400,
        false,
        `Mata pelajaran dengan nama "${dto.name}" sudah terdaftar`,
      );
    }

    let imageUrl = '';

    // Buat subject baru
    const subject = this.subjectRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      image: imageUrl,
      created_at: new Date(),
      created_by: dto.createdBy ?? null,
    });

    const savedSubject = await this.subjectRepository.save(subject);

    // Upload image jika ada file
    if (imageFile) {
      const fileDto = this.fileUploadService.convertMulterFileToDto(imageFile);

      const uploadResult = await this.fileUploadService.uploadImage(
        fileDto,
        savedSubject.subject_id,
        'subjects',
        false,
      );

      imageUrl = uploadResult.url;

      await this.subjectRepository.update(savedSubject.subject_id, {
        image: imageUrl,
      });
      savedSubject.image = imageUrl;
    }

    const subjectDetail = this.getSubjectDetailData(savedSubject);

    const response: DetailResponseDto<SubjectDetailResponseDto> = {
      status: 200,
      isSuccess: true,
      message: 'Mata pelajaran berhasi dibuat!',
      data: subjectDetail,
    };

    return response;
  }

  private async findSubjectOrThrow(id: string) {
    const qb = this.subjectRepository
      .createQueryBuilder('subject')
      .where('subject.subject_id = :id', { id });

    const subject = await qb.getOne();

    if (!subject) {
      throw new NotFoundException(`Subject with id ${id} not found`);
    }

    return subject;
  }

  async updateSubject(
    id: string,
    dto: UpdateSubjectDto,
    imageFile?: Express.Multer.File,
  ): Promise<DetailResponseDto<SubjectDetailResponseDto>> {
    // Cari mata pelajaran yang akan diupdate
    const existingSubject = await this.findSubjectOrThrow(id);

    let imageUrl = existingSubject.image;

    // Jika ada file baru, upload dan hapus file lama jika ada
    if (imageFile) {
      // Hapus file lama jika ada
      if (existingSubject.image) {
        await this.fileUploadService.deleteImage(
          existingSubject.image,
          'subjects',
        );
      }

      // Convert Multer file to DTO
      const fileDto = this.fileUploadService.convertMulterFileToDto(imageFile);

      // Upload file baru
      const uploadResult = await this.fileUploadService.uploadImage(
        fileDto,
        existingSubject.subject_id,
        'subjects',
        false,
      );

      imageUrl = uploadResult.url;
    }

    const slug = slugify(dto.name);

    // Cek apakah slug duplicate
    const isDuplicate = await SlugHelper.checkDuplicateSlug(
      this.subjectRepository,
      slug,
      'subject_id',
      id,
    );

    if (isDuplicate) {
      return new DetailResponseDto<SubjectDetailResponseDto>(
        400,
        false,
        `Mata pelajaran dengan nama "${dto.name}" sudah terdaftar`,
      );
    }

    // Update properti yang ada
    existingSubject.name = dto.name;
    existingSubject.slug = slug;
    existingSubject.description = dto.description ?? null;
    existingSubject.image = imageUrl;
    existingSubject.updated_at = new Date();
    existingSubject.updated_by = dto.updatedBy;

    // Simpan perubahan utama subject
    const updatedSubject = await this.subjectRepository.save(existingSubject);

    const subjectDetail = this.getSubjectDetailData(updatedSubject);

    const response: DetailResponseDto<SubjectDetailResponseDto> = {
      status: 200,
      isSuccess: true,
      message: 'Mata pelajaran berhasil diperbarui!',
      data: subjectDetail,
    };

    return response;
  }

  async deleteSubject(id: string): Promise<BaseResponseDto> {
    // cek subject dulu
    const subject = await this.findSubjectOrThrow(id);

    if (subject.image) {
      // hapus image dari storage
      await this.fileUploadService.deleteImage(subject.image, 'subjects');
    }

    // Hapus subject
    await this.subjectRepository.delete(id);

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: 'Mata pelajaran berhasil dihapus!',
    };

    return response;
  }
}
