import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskAnswerLog } from './entities/task-answer-log.entity';
import { TaskAnswerLogService } from './task-answer-logs.service';
import { CommonModule } from 'src/common/common.module';
import { TaskQuestionOption } from '../task-question-options/entities/task-question-option.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskAnswerLog, TaskQuestionOption]),
    CommonModule,
  ],
  providers: [TaskAnswerLogService],
  exports: [TaskAnswerLogService], // <== kalau mau dipakai di module lain
})
export class TaskAnswerLogModule {}
