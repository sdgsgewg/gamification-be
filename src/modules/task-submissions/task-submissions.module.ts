import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskSubmission } from './entities/task-submission.entity';
import { TaskSubmissionController } from './task-submissions.controller';
import { TaskSubmissionService } from './task-submissions.service';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import { TaskQuestionOption } from '../task-question-options/entities/task-question-option.entity';
import { UserModule } from '../users/users.module';
import { ActivityLogModule } from '../activty-logs/activity-logs.module';
import { Class } from '../classes/entities/class.entity';
import { ClassTask } from '../class-tasks/entities/class-task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskSubmission,
      TaskAttempt,
      TaskAnswerLog,
      TaskQuestionOption,
      Class,
      ClassTask,
    ]),
    UserModule,
    ActivityLogModule,
  ],
  controllers: [TaskSubmissionController],
  providers: [TaskSubmissionService],
  exports: [TaskSubmissionService],
})
export class TaskSubmissionModule {}
