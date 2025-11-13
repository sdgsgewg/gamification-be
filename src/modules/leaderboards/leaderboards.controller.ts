import { Controller, Get, Param } from '@nestjs/common';
import { LeaderboardService } from './leaderboards.service';

@Controller('leaderboards')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * GET /leaderboards/global
   * Leaderboard global untuk semua siswa
   */
  @Get('global')
  async getGlobalLeaderboard() {
    return this.leaderboardService.findGlobalLeaderboard();
  }

  /**
   * GET /leaderboards/classes
   * Leaderboard antar kelas (akumulasi poin kelas)
   */
  @Get('classes')
  async getClassLeaderboard() {
    return this.leaderboardService.findClassLeaderboard();
  }

  /**
   * GET /leaderboards/classes/:classId/students
   * Leaderboard siswa dalam satu kelas
   */
  @Get('classes/:classId/students')
  async getClassStudentsLeaderboard(@Param('classId') classId: string) {
    return this.leaderboardService.findClassStudentsLeaderboard(classId);
  }
}
