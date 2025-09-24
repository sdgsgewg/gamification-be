import { IsIn, IsOptional, IsString } from 'class-validator';

export class FilterTaskTypeDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name'])
  orderBy?: 'createdAt' | 'updatedAt' | 'name';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
