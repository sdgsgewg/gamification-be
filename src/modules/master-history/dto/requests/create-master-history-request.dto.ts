import { IsNotEmpty, IsOptional } from 'class-validator';
import { MasterHistoryTransactionType } from '../../enums/master-history-transaction-type';

export class CreateMasterHistoryDto {
  @IsNotEmpty()
  tableName: string;

  @IsNotEmpty()
  pkName: string;

  @IsNotEmpty()
  pkValue: string;

  @IsNotEmpty()
  transactionType: MasterHistoryTransactionType;

  @IsOptional()
  description: string;

  @IsOptional()
  dataBefore?: any;

  @IsOptional()
  dataAfter?: any;

  @IsNotEmpty()
  createdBy: string;
}
