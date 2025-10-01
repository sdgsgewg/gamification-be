import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './entities/material.entity';
import { MaterialGrade } from 'src/modules/material-grades/entities/material-grade.entity';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { FilterMaterialDto } from './dto/requests/filter-material.dto';
import { CreateMaterialDto } from './dto/requests/create-material.dto';
import { UpdateMaterialDto } from './dto/requests/update-material.dto';
import { MaterialOverviewResponseDto } from './dto/responses/material-overview-response.dto';
import { MaterialDetailResponseDto } from './dto/responses/material-detail-response.dto';
import { slugify } from '../../common/utils/slug.util';
import { DetailResponseDto } from 'src/common/responses/detail-response.dto';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { getDateTimeWithName } from 'src/common/utils/date-modifier.util';
import { SlugHelper } from 'src/common/helpers/slug.helper';
import { getDbColumn } from 'src/common/database/get-db-column.util';

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(MaterialGrade)
    private readonly materialGradeRepository: Repository<MaterialGrade>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async findAllMaterials(
    filterDto: FilterMaterialDto,
  ): Promise<MaterialOverviewResponseDto[]> {
    const qb = this.materialRepository
      .createQueryBuilder('material')
      .leftJoin('material.subject', 'subject')
      .leftJoin('material.materialGrades', 'materialGrade')
      .leftJoin('materialGrade.grade', 'grade')
      .select([
        'material.material_id AS "materialId"',
        'material.name AS "name"',
        'material.slug AS "slug"',
        'subject.name AS "subject"',
        `STRING_AGG(DISTINCT REPLACE(grade.name, 'Kelas ', ''), ', ') AS "materialGrade"`,
      ])
      .groupBy('material.material_id')
      .addGroupBy('subject.name');

    // filter
    if (filterDto.searchText) {
      qb.andWhere('material.name ILIKE :searchText', {
        searchText: `%${filterDto.searchText}%`,
      });
    }

    if (filterDto.subjectId) {
      qb.andWhere('material.subject_id = :subjectId', {
        subjectId: filterDto.subjectId,
      });
    }

    if (filterDto.gradeIds && filterDto.gradeIds.length > 0) {
      qb.andWhere('materialGrade.grade_id IN (:...gradeIds)', {
        gradeIds: filterDto.gradeIds,
      });
    }

    // order by
    const orderBy = filterDto.orderBy ?? 'createdAt';
    const orderState = filterDto.orderState ?? 'DESC';

    // otomatis mapping property → nama kolom DB, fallback ke created_at
    const dbColumn = getDbColumn(Material, orderBy as keyof Material);

    qb.orderBy(`material.${dbColumn}`, orderState);

    const rawMaterials = await qb.getRawMany();

    const materialOverviews: MaterialOverviewResponseDto[] = rawMaterials.map(
      (m) => ({
        materialId: m.materialId,
        name: m.name,
        slug: m.slug,
        subject: m.subject,
        materialGrade: m.materialGrade || null,
      }),
    );

    return materialOverviews;
  }

  private getMaterialDetailData(
    materialWithRelations: Material,
  ): MaterialDetailResponseDto {
    const data: MaterialDetailResponseDto = {
      materialId: materialWithRelations.material_id,
      name: materialWithRelations.name,
      slug: materialWithRelations.slug,
      description: materialWithRelations.description ?? null,
      image: materialWithRelations.image ?? null,
      subject: materialWithRelations.subject
        ? {
            subjectId: materialWithRelations.subject.subject_id,
            name: materialWithRelations.subject.name,
          }
        : null,
      materialGradeIds: materialWithRelations.materialGrades
        ? materialWithRelations.materialGrades.map((mg) => mg.grade_id)
        : [],
      materialGrade:
        materialWithRelations.materialGrades &&
        materialWithRelations.materialGrades.length > 0
          ? materialWithRelations.materialGrades
              .map((mg) => mg.grade.name.replace('Kelas ', ''))
              .join(', ')
          : null,
      createdBy: `${getDateTimeWithName(materialWithRelations.created_at, materialWithRelations.created_by)}`,
      updatedBy: materialWithRelations.updated_by
        ? `${getDateTimeWithName(materialWithRelations.updated_at, materialWithRelations.updated_by)}`
        : null,
    };

    return data;
  }

  async findMaterialBySlug(slug: string): Promise<MaterialDetailResponseDto> {
    const qb = this.materialRepository
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.subject', 'subject')
      .leftJoinAndSelect('material.materialGrades', 'materialGrade')
      .leftJoinAndSelect('materialGrade.grade', 'grade')
      .where('material.slug = :slug', { slug })
      .orderBy('grade.name', 'ASC');

    const material = await qb.getOne();

    if (!material) {
      throw new NotFoundException(`Material with slug ${slug} not found`);
    }

    const materialDetail = this.getMaterialDetailData(material);

    return materialDetail;
  }

  async createMaterial(
    dto: CreateMaterialDto,
    imageFile?: Express.Multer.File,
  ): Promise<DetailResponseDto<MaterialDetailResponseDto>> {
    const slug = slugify(dto.name);

    // Cek apakah slug duplicate
    const isDuplicate = await SlugHelper.checkDuplicateSlug(
      this.materialRepository,
      slug,
      'material_id',
    );

    if (isDuplicate) {
      return new DetailResponseDto<MaterialDetailResponseDto>(
        400,
        false,
        `Materi pelajaran dengan nama "${dto.name}" sudah terdaftar`,
      );
    }

    let imageUrl = '';

    const material = this.materialRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      image: imageUrl,
      created_at: new Date(),
      created_by: dto.createdBy ?? null,
      subject_id: dto.subjectId,
    });

    const savedMaterial = await this.materialRepository.save(material);

    // Upload image jika ada file
    if (imageFile) {
      const fileDto = this.fileUploadService.convertMulterFileToDto(imageFile);

      const uploadResult = await this.fileUploadService.uploadImage(
        fileDto,
        savedMaterial.material_id,
        'materials',
        false,
      );

      imageUrl = uploadResult.url;

      await this.materialRepository.update(savedMaterial.material_id, {
        image: imageUrl,
      });
      savedMaterial.image = imageUrl;
    }

    if (dto.gradeIds && dto.gradeIds.length > 0) {
      const grades = dto.gradeIds.map((gradeId) =>
        this.materialGradeRepository.create({
          material_id: savedMaterial.material_id,
          grade_id: gradeId,
        }),
      );
      await this.materialGradeRepository.save(grades);
    }

    // Query ulang untuk ambil subject + grades
    const taskWithRelations = await this.materialRepository.findOne({
      where: { material_id: savedMaterial.material_id },
      relations: ['subject', 'materialGrades', 'materialGrades.grade'],
    });

    const materialDetail = this.getMaterialDetailData(taskWithRelations);

    const response: DetailResponseDto<MaterialDetailResponseDto> = {
      status: 200,
      isSuccess: true,
      message: 'Materi pelajaran berhasi dibuat!',
      data: materialDetail,
    };

    return response;
  }

  private async findMaterialOrThrow(id: string) {
    const qb = this.materialRepository
      .createQueryBuilder('material')
      .where('material.material_id = :id', { id });

    const material = await qb.getOne();

    if (!material) {
      throw new NotFoundException(`Material with id ${id} not found`);
    }

    return material;
  }

  async updateMaterial(
    id: string,
    dto: UpdateMaterialDto,
    imageFile?: Express.Multer.File,
  ): Promise<DetailResponseDto<MaterialDetailResponseDto>> {
    // Cari materi yang akan diupdate
    const existingMaterial = await this.findMaterialOrThrow(id);

    let imageUrl = existingMaterial.image;

    // Jika ada file baru, upload dan hapus file lama jika ada
    if (imageFile) {
      // Hapus file lama jika ada
      if (existingMaterial.image) {
        await this.fileUploadService.deleteImage(
          existingMaterial.image,
          'materials',
        );
      }

      // Convert Multer file to DTO
      const fileDto = this.fileUploadService.convertMulterFileToDto(imageFile);

      // Upload file baru
      const uploadResult = await this.fileUploadService.uploadImage(
        fileDto,
        existingMaterial.material_id,
        'materials',
        false,
      );

      imageUrl = uploadResult.url;
    }

    const slug = slugify(dto.name);

    // Cek apakah slug duplicate
    const isDuplicate = await SlugHelper.checkDuplicateSlug(
      this.materialRepository,
      slug,
      'material_id',
      id,
    );

    if (isDuplicate) {
      return new DetailResponseDto<MaterialDetailResponseDto>(
        400,
        false,
        `Materi pelajaran dengan nama "${dto.name}" sudah terdaftar`,
      );
    }

    // Update properti yang ada
    existingMaterial.name = dto.name;
    existingMaterial.slug = slug;
    existingMaterial.description = dto.description ?? null;
    existingMaterial.image = imageUrl;
    existingMaterial.updated_at = new Date();
    existingMaterial.updated_by = dto.updatedBy;

    if (dto.subjectId) {
      existingMaterial.subject_id = dto.subjectId;
    }

    // Simpan perubahan utama material
    const updatedMaterial =
      await this.materialRepository.save(existingMaterial);

    // Logic sinkronisasi material_grades
    if (dto.gradeIds) {
      // ambil semua gradeId existing
      const existingGrades = await this.materialGradeRepository.find({
        where: { material_id: updatedMaterial.material_id },
      });

      const existingGradeIds = existingGrades.map((g) => g.grade_id);
      const newGradeIds = dto.gradeIds;

      // Tentukan mana yang harus dihapus
      const toDelete = existingGrades.filter(
        (g) => !newGradeIds.includes(g.grade_id),
      );

      // Tentukan mana yang harus ditambah
      const toInsert = newGradeIds.filter(
        (id) => !existingGradeIds.includes(id),
      );

      // Hapus record yang tidak ada di dto
      if (toDelete.length > 0) {
        await this.materialGradeRepository.remove(toDelete);
      }

      // Insert record baru
      if (toInsert.length > 0) {
        const newRecords = toInsert.map((gradeId) =>
          this.materialGradeRepository.create({
            material_id: updatedMaterial.material_id,
            grade_id: gradeId,
          }),
        );
        await this.materialGradeRepository.save(newRecords);
      }
    } else {
      // kalau dto.gradeIds kosong → hapus semua mapping
      await this.materialGradeRepository.delete({
        material_id: updatedMaterial.material_id,
      });
    }

    // Reload material dengan relasi subject & grades
    const materialWithRelations = await this.materialRepository.findOne({
      where: { material_id: updatedMaterial.material_id },
      relations: ['subject', 'materialGrades', 'materialGrades.grade'],
    });

    const materialDetail = this.getMaterialDetailData(materialWithRelations);

    const response: DetailResponseDto<MaterialDetailResponseDto> = {
      status: 200,
      isSuccess: true,
      message: 'Materi pelajaran berhasil diperbarui!',
      data: materialDetail,
    };

    return response;
  }

  async deleteMaterial(id: string): Promise<BaseResponseDto> {
    // cek material dulu
    const material = await this.findMaterialOrThrow(id);

    if (material.image) {
      // hapus image dari storage
      await this.fileUploadService.deleteImage(material.image, 'materials');
    }

    // Hapus data di material_grades
    await this.materialGradeRepository.delete({
      material_id: id,
    });

    // Hapus material
    await this.materialRepository.delete(id);

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: 'Materi pelajaran berhasil dihapus!',
    };

    return response;
  }
}
