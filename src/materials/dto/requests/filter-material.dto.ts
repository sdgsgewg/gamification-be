import { IsOptional, IsString } from 'class-validator';

export class FilterMaterialDto {
  @IsOptional()
  @IsString()
  searchText?: string;
}
