import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskAttemptController } from './task-attempts.controller';
import { TaskAttemptService } from './task-attempts.service';
import { TaskAttempt } from './entities/task-attempt.entity';
import { TaskAnswerLogModule } from '../task-answer-logs/task-answer-logs.module';
import { Task } from '../tasks/entities/task.entity';
import { UserModule } from '../users/users.module';
import { TaskSubmissionModule } from '../task-submissions/task-submissions.module';
import { ActivityLogModule } from '../activty-logs/activity-logs.module';
import { Class } from '../classes/entities/class.entity';
import { ClassTask } from '../class-tasks/entities/class-task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskAttempt, Task, Class, ClassTask]),
    TaskAnswerLogModule,
    UserModule,
    TaskSubmissionModule,
    ActivityLogModule,
  ],
  controllers: [TaskAttemptController],
  providers: [TaskAttemptService],
  exports: [TaskAttemptService],
})
export class TaskAttemptModule {}
