import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskGrade } from './entities/task-grade.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskGrade]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class TaskGradeModule {}
