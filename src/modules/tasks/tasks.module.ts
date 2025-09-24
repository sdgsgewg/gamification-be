import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskController } from './tasks.controller';
import { TaskService } from './tasks.service';
import { Subject } from 'src/modules/subjects/entities/subject.entity';
import { Material } from 'src/modules/materials/entities/material.entity';
import { TaskGrade } from 'src/modules/task-grades/entities/task-grade.entity';
import { Task } from './entities/task.entity';
import { TaskType } from 'src/modules/task-types/entities/task-type.entity';
import { TaskQuestion } from 'src/modules/task-questions/entities/task-question.entity';
import { TaskQuestionOption } from 'src/modules/task-question-options/entities/task-question-option.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      Subject,
      Material,
      TaskType,
      TaskGrade,
      TaskQuestion,
      TaskQuestionOption,
    ]),
    CommonModule,
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
