import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { LeaderboardController } from './leaderboards.controller';
import { LeaderboardService } from './leaderboards.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService], // <== kalau mau dipakai di module lain
})
export class LeaderboardModule {}
