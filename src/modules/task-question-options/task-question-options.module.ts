import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskQuestionOption } from './entities/task-question-option.entity';
import { TaskQuestionOptionService } from './task-question-options.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskQuestionOption])],
  providers: [TaskQuestionOptionService],
  exports: [TaskQuestionOptionService], // <== kalau mau dipakai di module lain
})
export class TaskQuestionOptionModule {}
