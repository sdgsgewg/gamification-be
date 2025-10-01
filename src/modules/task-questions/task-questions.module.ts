import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskQuestion } from './entities/task-question.entity';
import { TaskQuestionService } from './task-questions.service';
import { CommonModule } from 'src/common/common.module';
import { TaskQuestionOptionModule } from '../task-question-options/task-question-options.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskQuestion]),
    TaskQuestionOptionModule,
    CommonModule,
  ],
  providers: [TaskQuestionService],
  exports: [TaskQuestionService], // <== kalau mau dipakai di module lain
})
export class TaskQuestionModule {}
