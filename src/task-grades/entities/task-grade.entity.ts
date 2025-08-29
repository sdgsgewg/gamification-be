import { Grade } from 'src/grades/entities/grade.entity';
import { Task } from 'src/tasks/entities/task.entity';
import { Entity, Column, PrimaryColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity('task_grades')
export class TaskGrade {
  @PrimaryColumn()
  task_grade_id: string;

  @Column()
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
