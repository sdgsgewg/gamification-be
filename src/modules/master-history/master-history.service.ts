import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { getDate } from 'src/common/utils/date-modifier.util';
import { MasterHistory } from './entities/master-history.entity';
import { MasterHistoryOverviewResponseDto } from './dto/responses/master-history-overview-response.dto';
import { CreateMasterHistoryDto } from './dto/requests/create-master-history-request.dto';

@Injectable()
export class MasterHistoryService {
  constructor(
    @InjectRepository(MasterHistory)
    private readonly masterHistoryRepository: Repository<MasterHistory>,
  ) {}

  async findUserMasterHistory(
    userId: string,
  ): Promise<MasterHistoryOverviewResponseDto[]> {
    const masterHistory = await this.masterHistoryRepository.find({
      where: {
        created_by: userId,
      },
      relations: {
        createdBy: true,
      },
      order: {
        created_at: 'DESC',
      },
    });

    const masterHistoryOverviews: MasterHistoryOverviewResponseDto[] =
      masterHistory.map((mh) => ({
        id: mh.id,
        description: mh.description,
        createdAt: getDate(mh.created_at),
      }));

    return masterHistoryOverviews;
  }

  async createMasterHistory(
    dto: CreateMasterHistoryDto,
  ): Promise<BaseResponseDto> {
    // Buat activity log baru
    const masterHistory = this.masterHistoryRepository.create({
      table_name: dto.tableName,
      pk_name: dto.pkName,
      pk_value: dto.pkValue,
      transaction_type: dto.transactionType,
      description: dto.description,
      data_before: dto.dataBefore,
      data_after: dto.dataAfter,
      created_at: new Date(),
      created_by: dto.createdBy,
    });

    await this.masterHistoryRepository.save(masterHistory);

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: 'Activity log has been created!',
    };

    return response;
  }
}
