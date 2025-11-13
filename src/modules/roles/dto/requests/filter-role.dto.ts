import { IsOptional, IsIn } from 'class-validator';

export class FilterRoleDto {
  @IsOptional()
  @IsIn(['createdAt', 'name'])
  orderBy?: 'createdAt' | 'name';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
