import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../tasks/entities/task.entity';
import { ActivityController } from './activities.controller';
import { ActivityService } from './activities.service';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskAttempt, TaskAnswerLog, User])],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
