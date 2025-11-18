import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MasterHistoryService } from './master-history.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('/master-history')
export class MasterHistoryController {
  constructor(private readonly masterHistoryService: MasterHistoryService) {}

  @Get('')
  @UseGuards(JwtAuthGuard)
  async getUserActivityLogs(@Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.masterHistoryService.findUserMasterHistory(userId);
  }
}
