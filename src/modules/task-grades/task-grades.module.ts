import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskGrade } from './entities/task-grade.entity';
import { TaskGradeService } from './task-grades.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskGrade])],
  controllers: [],
  providers: [TaskGradeService],
  exports: [TaskGradeService],
})
export class TaskGradeModule {}
