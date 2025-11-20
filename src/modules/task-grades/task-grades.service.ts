import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskGrade } from './entities/task-grade.entity';

@Injectable()
export class TaskGradeService {
  constructor(
    @InjectRepository(TaskGrade)
    private readonly taskGradeRepository: Repository<TaskGrade>,
  ) {}

  async createTaskGrades(taskId: string, gradeIds: string[]) {
    const grades = gradeIds.map((gradeId) =>
      this.taskGradeRepository.create({
        taskId,
        gradeId,
        createdAt: new Date(),
      }),
    );
    await this.taskGradeRepository.save(grades);
  }

  async syncTaskGrades(taskId: string, gradeIds: string[]) {
    const existingGrades = await this.taskGradeRepository.find({
      where: { taskId },
    });

    const existingGradeIds = existingGrades.map((g) => g.gradeId);
    const newGradeIds = gradeIds || [];

    // Hapus yang tidak ada di DTO
    const toDelete = existingGrades.filter(
      (g) => !newGradeIds.includes(g.gradeId),
    );
    if (toDelete.length > 0) {
      await this.taskGradeRepository.remove(toDelete);
    }

    // Tambah yang baru
    const toInsert = newGradeIds.filter((id) => !existingGradeIds.includes(id));
    if (toInsert.length > 0) {
      const newRecords = toInsert.map((gradeId) =>
        this.taskGradeRepository.create({
          taskId,
          gradeId,
        }),
      );
      await this.taskGradeRepository.save(newRecords);
    }
  }

  async deleteTaskGrades(taskId: string) {
    await this.taskGradeRepository.delete({ taskId });
  }
}
