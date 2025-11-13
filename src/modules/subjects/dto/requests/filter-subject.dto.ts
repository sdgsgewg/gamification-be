import { IsOptional, IsString, IsIn } from 'class-validator';

export class FilterSubjectDto {
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
