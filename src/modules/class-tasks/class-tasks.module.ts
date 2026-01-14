import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from '../classes/entities/class.entity';
import { ClassTask } from '../class-tasks/entities/class-task.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import { ClassTaskController } from './class-tasks.controller';
import { ClassTaskService } from './class-tasks.service';
import { Task } from '../tasks/entities/task.entity';
import { ActivityLogModule } from '../activty-logs/activity-logs.module';
import { TaskAttemptModule } from '../task-attempts/task-attempts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassTask,
      Class,
      Task,
      TaskAttempt,
      TaskAnswerLog,
    ]),
    TaskAttemptModule,
    ActivityLogModule,
  ],
  controllers: [ClassTaskController],
  providers: [ClassTaskService],
  exports: [ClassTaskService],
})
export class ClassTaskModule {}
