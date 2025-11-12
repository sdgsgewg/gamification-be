import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { CreateActivityLogDto } from './dto/requests/create-activity-log.dto';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { ActivityLogOverviewResponseDto } from './dto/responses/activity-log-overview-response.dto';
import { getDate } from 'src/common/utils/date-modifier.util';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  async findUserActivityLogs(
    userId: string,
  ): Promise<ActivityLogOverviewResponseDto[]> {
    console.log('User id: ', userId);
    const activityLogs = await this.activityLogRepository.find({
      where: {
        user_id: userId,
      },
      relations: {
        user: true,
      },
      order: {
        created_at: 'DESC',
      },
    });

    const activityLogOverviews: ActivityLogOverviewResponseDto[] =
      activityLogs.map((al) => ({
        id: al.id,
        description: al.description,
        createdAt: getDate(al.created_at),
      }));

    return activityLogOverviews;
  }

  async createActivityLog(dto: CreateActivityLogDto): Promise<BaseResponseDto> {
    // Buat activity log baru
    const activityLog = this.activityLogRepository.create({
      user_id: dto.userId,
      event_type: dto.eventType,
      description: dto.description,
      metadata: dto.metadata,
      created_at: new Date(),
    });

    await this.activityLogRepository.save(activityLog);

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: 'Activity log has been created!',
    };

    return response;
  }
}
