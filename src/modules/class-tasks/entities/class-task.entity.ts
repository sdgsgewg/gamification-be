import { Class } from 'src/modules/classes/entities/class.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import {
  Entity,
  Column,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('class_tasks')
export class ClassTask {
  @PrimaryGeneratedColumn('uuid')
  class_task_id: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: string;

  @Column({ type: 'uuid' })
  class_id: string;

  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;
}
