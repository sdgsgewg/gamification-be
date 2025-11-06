import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskAttemptController } from './task-attempts.controller';
import { TaskAttemptService } from './task-attempts.service';
import { TaskAttempt } from './entities/task-attempt.entity';
import { TaskAnswerLogModule } from '../task-answer-logs/task-answer-logs.module';
import { Task } from '../tasks/entities/task.entity';
import { TaskQuestion } from '../task-questions/entities/task-question.entity';
import { TaskQuestionOption } from '../task-question-options/entities/task-question-option.entity';
import { UserModule } from '../users/users.module';
import { TaskSubmissionModule } from '../task-submissions/task-submissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskAttempt,
      Task,
      TaskQuestion,
      TaskQuestionOption,
    ]),
    TaskAnswerLogModule,
    UserModule,
    TaskSubmissionModule
  ],
  controllers: [TaskAttemptController],
  providers: [TaskAttemptService],
  exports: [TaskAttemptService],
})
export class TaskAttemptModule {}
