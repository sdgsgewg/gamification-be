import { IsOptional, IsString, IsIn } from 'class-validator';

export class FilterClassMemberDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsIn(['name'])
  orderBy?: 'name';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderState?: 'ASC' | 'DESC';
}
