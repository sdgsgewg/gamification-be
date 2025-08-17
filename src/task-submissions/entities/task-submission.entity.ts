import { TaskAttempt } from 'src/task-attempts/entities/task-attempt.entity';
import { Entity, Column, PrimaryColumn, JoinColumn, OneToOne } from 'typeorm';

@Entity('task_submissions')
export class TaskSubmission {
  @PrimaryColumn()
  task_submission_id: string;

  @Column()
  score: number;

  @Column()
  feedback: string;

  @Column()
  status: string;

  @Column()
  created_at: Date;

  @Column()
  task_attempt_id: string;

  @OneToOne(() => TaskAttempt)
  @JoinColumn({ name: 'task_attempt_id' })
  taskAttempt: TaskAttempt;
}
