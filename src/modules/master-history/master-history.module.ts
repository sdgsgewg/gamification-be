import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterHistory } from './entities/master-history.entity';
import { MasterHistoryController } from './master-history.controller';
import { MasterHistoryService } from './master-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([MasterHistory])],
  controllers: [MasterHistoryController],
  providers: [MasterHistoryService],
  exports: [MasterHistoryService],
})
export class MasterHistoryModule {}
