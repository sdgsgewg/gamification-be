import { Controller, Get, Param, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboards.service';
import { FilterStudentLeaderboardDto } from './dto/requests/filter-student-leaderboard.dto';

@Controller('leaderboards')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * GET /leaderboards/students
   * Leaderboard antar siswa (akumulasi poin siswa)
   */
  @Get('students')
  async getStudentLeaderboard(@Query() filterDto: FilterStudentLeaderboardDto) {
    return this.leaderboardService.findStudentLeaderboard(filterDto);
  }

  /**
   * GET /leaderboards/classes/:classId/students
   * Leaderboard siswa dalam satu kelas
   */
  @Get('classes/:classId/students')
  async getClassStudentsLeaderboard(@Param('classId') classId: string) {
    return this.leaderboardService.findClassStudentsLeaderboard(classId);
  }

  /**
   * GET /leaderboards/classes
   * Leaderboard antar kelas (akumulasi poin kelas)
   */
  @Get('classes')
  async getClassLeaderboard() {
    return this.leaderboardService.findClassLeaderboard();
  }
}
