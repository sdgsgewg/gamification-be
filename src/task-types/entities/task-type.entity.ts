import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('task_types')
export class TaskType {
  @PrimaryColumn()
  task_type_id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column()
  description: string;

  @Column()
  scope: string;

  @Column()
  has_deadline: boolean;

  @Column()
  is_competitive: boolean;

  @Column()
  is_repeatable: boolean;

  @Column()
  point_multiplier: number;

  @Column()
  created_at: Date;
}
