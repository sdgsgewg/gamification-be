import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskController } from './tasks.controller';
import { TaskService } from './tasks.service';
import { TaskGrade } from 'src/modules/task-grades/entities/task-grade.entity';
import { Task } from './entities/task.entity';
import { CommonModule } from 'src/common/common.module';
import { TaskQuestionModule } from '../task-questions/task-questions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskGrade]),
    TaskQuestionModule,
    CommonModule,
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
