import {
  Controller,
  Query,
  Get,
  Param,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ActivityService } from './activities.service';
import { FilterActivityDto } from './dto/requests/filter-activity.dto';

@Controller('/activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('')
  async getAllActivities(@Query() filterDto: FilterActivityDto) {
    return this.activityService.findAllActivities(filterDto);
  }

  @Get(':slug')
  async getActivityDetail(@Param('slug') slug: string, @Req() req: Request) {
    if (!slug) {
      throw new BadRequestException('Task slug is required');
    }

    // Ambil userId dari request (kalau user login)
    // const userId =
    //   (req as any).user?.id || '814ac2c9-3b7b-4d57-a7a1-b3d378dbc05e';
    const userId = (req as any).user?.id || null;
    console.log('User Id: ', userId);

    return this.activityService.findActivityBySlug(slug, userId);
  }
}
