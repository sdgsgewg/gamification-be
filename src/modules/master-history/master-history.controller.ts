import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MasterHistoryService } from './master-history.service';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

@Controller('/master-history')
export class MasterHistoryController {
  constructor(private readonly masterHistoryService: MasterHistoryService) {}

  @Get('')
  @UseGuards(OptionalJwtAuthGuard)
  async getUserActivityLogs(@Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.masterHistoryService.findUserMasterHistory(userId);
  }
}
