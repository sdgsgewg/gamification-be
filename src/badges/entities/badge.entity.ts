import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('badges')
export class Badge {
  @PrimaryColumn()
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

  @Column()
  created_at: string;
}
