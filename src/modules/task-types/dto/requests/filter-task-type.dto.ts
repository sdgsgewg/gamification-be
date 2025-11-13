import { IsIn, IsOptional, IsString } from 'class-validator';

export class FilterTaskTypeDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  scope?: string;

  @IsOptional()
  hasDeadline?: string;

  @IsOptional()
  isCompetitive?: string;

  @IsOptional()
  isRepeatable?: string;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name'])
  orderBy?: 'createdAt' | 'updatedAt' | 'name';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
