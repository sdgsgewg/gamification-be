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
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

@Controller('/activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('')
  async getAllActivities(@Query() filterDto: FilterActivityDto) {
    return this.activityService.findAllActivities(filterDto);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  async getActivityDetail(@Param('slug') slug: string, @Req() req: any) {
    if (!slug) {
      throw new BadRequestException('Activity slug is required');
    }

    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.activityService.findActivityBySlug(slug, userId);
  }

  @Get('attempt/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  async getActivityWithQuestions(@Param('slug') slug: string, @Req() req: any) {
    if (!slug) {
      throw new BadRequestException('Activity slug is required');
    }

    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.activityService.findActivityWithQuestions(slug, userId);
  }

  @Get('summary/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  async getActivitySummaryFromAttempt(@Param('slug') slug: string, @Req() req: any) {
    if (!slug) {
      throw new BadRequestException('Activity slug is required');
    }

    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.activityService.findActivitySummaryFromAttempt(slug, userId);
  }
}
