import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { FilterRoleDto } from './dto/requests/filter-role.dto';
import { getDbColumn } from 'src/common/database/get-db-column.util';
import { RoleOverviewResponseDto } from './dto/responses/role-overview-response.dto';
import { RoleDetailResponseDto } from './dto/responses/role-detail-response.dto';
import { getDateTime } from 'src/common/utils/date-modifier.util';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAllRoles(
    filterDto: FilterRoleDto,
  ): Promise<RoleOverviewResponseDto[]> {
    const qb = this.roleRepository
      .createQueryBuilder('role')
      .select(['role.role_id AS "roleId"', 'role.name AS "name"'])
      .where('role.name <> :admin', { admin: 'Admin' });

    const orderBy = filterDto.orderBy ?? 'createdAt';
    const orderState = filterDto.orderState ?? 'ASC';

    // otomatis mapping property → nama kolom DB, fallback ke name
    const dbColumn = getDbColumn(Role, orderBy as keyof Role);

    qb.orderBy(`role.${dbColumn}`, orderState);

    const rawRoles = await qb.getRawMany();

    const roleOverviews: RoleOverviewResponseDto[] = rawRoles.map((g) => ({
      roleId: g.roleId,
      name: g.name,
    }));

    return roleOverviews;
  }

  private getRoleDetailData(role: Role): RoleDetailResponseDto {
    const data: RoleDetailResponseDto = {
      roleId: role.role_id,
      name: role.name,
      normalizedName: role.normalized_name,
      createdAt: `${getDateTime(role.created_at)}`,
    };

    return data;
  }

  async findRoleBy(
    field: 'id' | 'name',
    value: string,
  ): Promise<RoleDetailResponseDto> {
    const qb = this.roleRepository.createQueryBuilder('role');

    if (field === 'id') {
      qb.where('role.role_id = :value', { value });
    } else if (field === 'name') {
      qb.where('role.name = :value', { value });
    }

    const role = await qb.getOne();

    if (!role) {
      throw new NotFoundException(`Role with ${field} ${value} not found`);
    }

    return this.getRoleDetailData(role);
  }
}
