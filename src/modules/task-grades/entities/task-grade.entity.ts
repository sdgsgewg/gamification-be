import { Grade } from 'src/modules/grades/entities/grade.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('task_grades')
export class TaskGrade {
  @PrimaryGeneratedColumn('uuid')
  task_grade_id: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column()
  task_id: string;

  @Column()
  grade_id: string;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Grade)
  @JoinColumn({ name: 'grade_id' })
  grade: Grade;
}
