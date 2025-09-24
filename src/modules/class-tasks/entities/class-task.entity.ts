import { Class } from 'src/modules/class/entities/class.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { Entity, Column, PrimaryColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity('class_tasks')
export class ClassTask {
  @PrimaryColumn()
  class_task_id: string;

  @Column()
  created_at: Date;

  @Column()
  class_id: string;

  @Column()
  task_id: string;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;
}
