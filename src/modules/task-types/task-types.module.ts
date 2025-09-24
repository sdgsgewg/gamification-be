import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskType } from './entities/task-type.entity';
import { TaskTypeController } from './task-types.controller';
import { TaskTypeService } from './task-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskType])],
  controllers: [TaskTypeController],
  providers: [TaskTypeService],
  exports: [TaskTypeService],
})
export class TaskTypeModule {}
