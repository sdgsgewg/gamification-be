import {
  Controller,
  Query,
  Get,
  Param,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ActivityService } from './activities.service';
import { FilterActivityDto } from './dto/requests/filter-activity.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('/activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('')
  async getAllActivities(@Query() filterDto: FilterActivityDto) {
    return this.activityService.findAllActivities(filterDto);
  }

  @Get(':slug')
  @UseGuards(JwtAuthGuard)
  async getActivityDetail(@Param('slug') slug: string, @Req() req: any) {
    if (!slug) {
      throw new BadRequestException('Activity slug is required');
    }

    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    console.log('User:', JSON.stringify(req.user));
    console.log('User ID:', userId);
    return this.activityService.findActivityBySlug(slug, userId);
  }

  @Get('attempt/:slug')
  @UseGuards(JwtAuthGuard)
  async getActivityWithQuestions(@Param('slug') slug: string, @Req() req: any) {
    if (!slug) {
      throw new BadRequestException('Activity slug is required');
    }

    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.activityService.findActivityWithQuestions(slug, userId);
  }

  @Get('summary/:slug')
  @UseGuards(JwtAuthGuard)
  async getActivitySummaryFromAttempt(
    @Param('slug') slug: string,
    @Req() req: any,
  ) {
    if (!slug) {
      throw new BadRequestException('Activity slug is required');
    }

    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.activityService.findActivitySummaryFromAttempt(slug, userId);
  }
}
