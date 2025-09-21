import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Grade } from './entities/grade.entity';
import { Repository } from 'typeorm';
import { GradeOverviewResponseDto } from './dto/responses/grade-overview-response.dto';
import { FilterGradeDto } from './dto/requests/filter-grade.dto';
import { getDbColumn } from 'src/common/database/get-db-column.util';

@Injectable()
export class GradeService {
  constructor(
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
  ) {}

  async findAllGrades(
    filterDto: FilterGradeDto,
  ): Promise<GradeOverviewResponseDto[]> {
    const qb = this.gradeRepository
      .createQueryBuilder('grade')
      .select(['grade.grade_id AS "gradeId"', 'grade.name AS "name"']);

    const orderBy = filterDto.orderBy ?? 'name';
    const orderState = filterDto.orderState ?? 'ASC';

    // otomatis mapping property → nama kolom DB, fallback ke name
    const dbColumn = getDbColumn(Grade, orderBy as keyof Grade);

    qb.orderBy(`grade.${dbColumn}`, orderState);

    const rawGrades = await qb.getRawMany();

    const gradeOverviews: GradeOverviewResponseDto[] = rawGrades.map((g) => ({
      gradeId: g.gradeId,
      name: g.name,
    }));

    return gradeOverviews;
  }
}
