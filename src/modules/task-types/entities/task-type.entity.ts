import { Task } from 'src/modules/tasks/entities/task.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('task_types')
export class TaskType {
  @PrimaryGeneratedColumn('uuid')
  task_type_id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar' })
  scope: string;

  @Column({ type: 'boolean' })
  has_deadline: boolean;

  // @Column({ type: 'boolean' })
  // is_competitive: boolean;

  @Column({ type: 'boolean' })
  is_repeatable: boolean;

  // @Column({ type: 'float', default: 1 })
  // point_multiplier: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'varchar' })
  created_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  updated_at: Date;

  @Column({ type: 'varchar', nullable: true })
  updated_by: string;

  @OneToMany(() => Task, (t) => t.taskType)
  tasks: Task[];
}
