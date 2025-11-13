import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { LeaderboardController } from './leaderboards.controller';
import { LeaderboardService } from './leaderboards.service';
import { Class } from '../classes/entities/class.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Class, TaskAttempt])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService], // <== kalau mau dipakai di module lain
})
export class LeaderboardModule {}
