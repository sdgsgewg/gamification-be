import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskAttempt } from '../../modules/task-attempts/entities/task-attempt.entity';
import { ClassTask } from '../../modules/class-tasks/entities/class-task.entity';
import { TaskStatusCronService } from './task-status.cron.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([TaskAttempt, ClassTask]),
  ],
  providers: [TaskStatusCronService],
})
export class TaskStatusCronModule {}
