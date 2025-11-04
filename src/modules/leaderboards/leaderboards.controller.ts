import { Controller, Get } from '@nestjs/common';
import { LeaderboardService } from './leaderboards.service';

@Controller('/leaderboards')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('')
  async getGlobalLeaderboard() {
    return this.leaderboardService.findGlobalLeaderboard();
  }
}
