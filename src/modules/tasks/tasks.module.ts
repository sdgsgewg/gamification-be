import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskController } from './tasks.controller';
import { TaskService } from './tasks.service';
import { Task } from './entities/task.entity';
import { CommonModule } from 'src/common/common.module';
import { TaskQuestionModule } from '../task-questions/task-questions.module';
import { MasterHistoryModule } from '../master-history/master-history.module';
import { TaskGradeModule } from '../task-grades/task-grades.module';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskAttempt]),
    TaskGradeModule,
    TaskQuestionModule,
    CommonModule,
    MasterHistoryModule,
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
