import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  badge_id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  icon: string;

  @Column()
  criteria_type: string;

  @Column()
  criteria_value: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column()
  created_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  updated_at: Date;

  @Column({ nullable: true })
  updated_by: string;
}
