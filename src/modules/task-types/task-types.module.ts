import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskType } from './entities/task-type.entity';
import { TaskTypeController } from './task-types.controller';
import { TaskTypeService } from './task-types.service';
import { MasterHistoryModule } from '../master-history/master-history.module';

@Module({
  imports: [TypeOrmModule.forFeature([TaskType]), MasterHistoryModule],
  controllers: [TaskTypeController],
  providers: [TaskTypeService],
  exports: [TaskTypeService],
})
export class TaskTypeModule {}
