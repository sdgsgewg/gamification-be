import { IsOptional, IsString } from 'class-validator';

export class FilterSubjectDto {
  @IsOptional()
  @IsString()
  searchText?: string;
}
