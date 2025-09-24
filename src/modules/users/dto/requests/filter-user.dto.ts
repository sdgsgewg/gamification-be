import { IsOptional, IsIn, IsString } from 'class-validator';

export class FilterUserDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  gradeId?: string;

  @IsOptional()
  @IsIn(['createdAt', 'name'])
  orderBy?: 'createdAt' | 'name';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
