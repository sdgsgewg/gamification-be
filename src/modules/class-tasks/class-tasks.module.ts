import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from '../classes/entities/class.entity';
import { ClassTask } from '../class-tasks/entities/class-task.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import { ClassTaskController } from './class-tasks.controller';
import { ClassTaskService } from './class-tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassTask, Class, TaskAttempt, TaskAnswerLog]),
  ],
  controllers: [ClassTaskController],
  providers: [ClassTaskService],
  exports: [ClassTaskService],
})
export class ClassTaskModule {}
