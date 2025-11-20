import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassGrade } from './entity/class-grade.entity';

@Injectable()
export class ClassGradeService {
  constructor(
    @InjectRepository(ClassGrade)
    private readonly classGradeRepository: Repository<ClassGrade>,
  ) {}

  async createClassGrades(classId: string, gradeIds: string[]) {
    const grades = gradeIds.map((gradeId) =>
      this.classGradeRepository.create({
        classId,
        gradeId,
        createdAt: new Date(),
      }),
    );
    await this.classGradeRepository.save(grades);
  }

  async syncClassGrades(classId: string, gradeIds: string[]) {
    const existingGrades = await this.classGradeRepository.find({
      where: { classId },
    });

    const existingGradeIds = existingGrades.map((g) => g.gradeId);
    const newGradeIds = gradeIds || [];

    // Hapus yang tidak ada di DTO
    const toDelete = existingGrades.filter(
      (g) => !newGradeIds.includes(g.gradeId),
    );
    if (toDelete.length > 0) {
      await this.classGradeRepository.remove(toDelete);
    }

    // Tambah yang baru
    const toInsert = newGradeIds.filter((id) => !existingGradeIds.includes(id));
    if (toInsert.length > 0) {
      const newRecords = toInsert.map((gradeId) =>
        this.classGradeRepository.create({
          classId,
          gradeId,
        }),
      );
      await this.classGradeRepository.save(newRecords);
    }
  }

  async deleteClassGrades(classId: string) {
    await this.classGradeRepository.delete({ classId });
  }
}
