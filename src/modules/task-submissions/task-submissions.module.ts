import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskSubmission } from './entities/task-submission.entity';
import { TaskSubmissionController } from './task-submissions.controller';
import { TaskSubmissionService } from './task-submissions.service';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import { TaskQuestionOption } from '../task-question-options/entities/task-question-option.entity';
import { UserModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskSubmission,
      TaskAttempt,
      TaskAnswerLog,
      TaskQuestionOption,
    ]),
    UserModule,
  ],
  controllers: [TaskSubmissionController],
  providers: [TaskSubmissionService],
  exports: [TaskSubmissionService],
})
export class TaskSubmissionModule {}
