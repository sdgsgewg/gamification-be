import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './entities/material.entity';
import { FilterMaterialDto } from './dto/requests/filter-material.dto';
import { CreateMaterialDto } from './dto/requests/create-material.dto';
import { UpdateMaterialDto } from './dto/requests/update-material.dto';
import { MaterialResponseDto } from './dto/responses/material-response.dto';
import { slugify } from '../common/utils/slugify';
import { DetailResponseDto } from 'src/common/responses/detail-response.dto';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { MaterialGrade } from 'src/material-grades/entities/material-grade.entity';

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(MaterialGrade)
    private readonly materialGradeRepository: Repository<MaterialGrade>,
  ) {}

  async findAllMaterials(
    filterDto: FilterMaterialDto,
  ): Promise<MaterialResponseDto[]> {
    const qb = this.materialRepository
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.subject', 'subject')
      .leftJoinAndSelect('material.materialGrades', 'materialGrade')
      .leftJoinAndSelect('materialGrade.grade', 'grade');

    if (filterDto.searchText) {
      qb.andWhere('material.name ILIKE :searchText', {
        searchText: `%${filterDto.searchText}%`,
      }).orWhere('subject.name ILIKE :searchText', {
        searchText: `%${filterDto.searchText}%`,
      });
    }

    const materials = await qb.getMany();

    return materials.map((m) => ({
      materialId: m.material_id,
      name: m.name,
      slug: m.slug,
      description: m.description,
      image: m.image,
      createdAt: m.created_at,
      createdBy: m.created_by,
      updatedAt: m.updated_at,
      updatedBy: m.updated_by,
      subject: m.subject
        ? { subjectId: m.subject.subject_id, name: m.subject.name }
        : null,
      grade:
        m.materialGrades && m.materialGrades.length > 0
          ? m.materialGrades
              .map((mg) => mg.grade.name.replace('Kelas ', ''))
              .join(', ')
          : null,
    }));
  }

  async findMaterialBySlug(slug: string): Promise<MaterialResponseDto> {
    const qb = this.materialRepository
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.subject', 'subject')
      .leftJoinAndSelect('material.materialGrades', 'materialGrade')
      .leftJoinAndSelect('materialGrade.grade', 'grade')
      .where('material.slug = :slug', { slug });

    const material = await qb.getOne();

    if (!material) {
      throw new NotFoundException(`Material with slug ${slug} not found`);
    }

    return {
      materialId: material.material_id,
      name: material.name,
      slug: material.slug,
      description: material.description,
      image: material.image,
      createdAt: material.created_at,
      createdBy: material.created_by,
      updatedAt: material.updated_at,
      updatedBy: material.updated_by,
      subject: material.subject
        ? {
            subjectId: material.subject.subject_id,
            name: material.subject.name,
          }
        : null,
      gradeIds: material.materialGrades
        ? material.materialGrades.map((mg) => mg.grade_id)
        : [],
      grade:
        material.materialGrades && material.materialGrades.length > 0
          ? material.materialGrades
              .map((mg) => mg.grade.name.replace('Kelas ', ''))
              .join(', ')
          : null,
    };
  }

  async createMaterial(
    dto: CreateMaterialDto,
  ): Promise<DetailResponseDto<MaterialResponseDto>> {
    const slug = slugify(dto.name);

    const material = this.materialRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      image: dto.image,
      created_at: new Date(),
      created_by: dto.createdBy ?? null,
      subject_id: dto.subjectId,
    });

    const saved = await this.materialRepository.save(material);

    if (dto.gradeIds && dto.gradeIds.length > 0) {
      const grades = dto.gradeIds.map((gradeId) =>
        this.materialGradeRepository.create({
          material_id: saved.material_id,
          grade_id: gradeId,
        }),
      );
      await this.materialGradeRepository.save(grades);
    }

    // Query ulang untuk ambil subject + grades
    const withRelations = await this.materialRepository.findOne({
      where: { material_id: saved.material_id },
      relations: ['subject', 'materialGrades', 'materialGrades.grade'],
    });

    const data: MaterialResponseDto = {
      materialId: withRelations.material_id,
      name: withRelations.name,
      slug: withRelations.slug,
      description: withRelations.description,
      image: withRelations.image,
      createdAt: withRelations.created_at,
      createdBy: withRelations.created_by,
      updatedAt: withRelations.updated_at,
      updatedBy: withRelations.updated_by,
      subject: withRelations.subject
        ? {
            subjectId: withRelations.subject.subject_id,
            name: withRelations.subject.name,
          }
        : null,
      grade:
        withRelations.materialGrades && withRelations.materialGrades.length > 0
          ? withRelations.materialGrades
              .map((mg) => mg.grade.name.replace('Kelas ', ''))
              .join(', ')
          : null,
    };

    return {
      status: 200,
      isSuccess: true,
      message: 'Material created successfully',
      data,
    };
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
  ): Promise<DetailResponseDto<MaterialResponseDto>> {
    // Cari materi yang akan diupdate
    const existingMaterial = await this.findMaterialOrThrow(id);

    const slug = slugify(dto.name);

    // Update properti yang ada
    existingMaterial.name = dto.name;
    existingMaterial.slug = slug;
    existingMaterial.description = dto.description;
    existingMaterial.image = dto.image;
    existingMaterial.updated_at = new Date();
    existingMaterial.updated_by = dto.updatedBy ?? null;

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

    const data: MaterialResponseDto = {
      materialId: materialWithRelations.material_id,
      name: materialWithRelations.name,
      slug: materialWithRelations.slug,
      description: materialWithRelations.description,
      image: materialWithRelations.image,
      createdAt: materialWithRelations.created_at,
      createdBy: materialWithRelations.created_by,
      updatedAt: materialWithRelations.updated_at,
      updatedBy: materialWithRelations.updated_by,
      subject: materialWithRelations.subject?.name
        ? {
            subjectId: materialWithRelations.subject.subject_id,
            name: materialWithRelations.subject.name,
          }
        : null,
      grade:
        materialWithRelations.materialGrades?.length > 0
          ? materialWithRelations.materialGrades
              .map((mg) => mg.grade.name.replace('Kelas ', ''))
              .join(', ')
          : null,
    };

    return {
      status: 200,
      isSuccess: true,
      message: 'Material updated successfully',
      data,
    };
  }

  async deleteMaterial(id: string): Promise<BaseResponseDto> {
    // cek material dulu
    await this.findMaterialOrThrow(id);

    await this.materialGradeRepository.delete({
      material_id: id,
    });

    await this.materialRepository.delete(id);

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: 'Material deleted successfully',
    };

    return response;
  }
}
