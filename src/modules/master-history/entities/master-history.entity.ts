import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MasterHistoryTransactionType } from '../enums/master-history-transaction-type';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('master_history')
export class MasterHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  table_name: string;

  @Column({ type: 'varchar' })
  pk_name: string;

  @Column({ type: 'uuid' })
  pk_value: string;

  @Column({ type: 'enum', enum: MasterHistoryTransactionType })
  transaction_type: MasterHistoryTransactionType;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  data_before: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  data_after: Record<string, any>;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
