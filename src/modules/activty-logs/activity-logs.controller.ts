import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ActivityLogService } from './activity-logs.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('/activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get('')
  @UseGuards(JwtAuthGuard)
  async getUserActivityLogs(@Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.activityLogService.findUserActivityLogs(userId);
  }

  @Get('submissions')
  @UseGuards(JwtAuthGuard)
  async getRecentSubmissions(@Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.activityLogService.findRecentSubmissions(userId);
  }
}
