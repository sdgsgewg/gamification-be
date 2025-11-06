import { TaskAttempt } from 'src/modules/task-attempts/entities/task-attempt.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToOne,
  ManyToOne,
} from 'typeorm';
import { TaskSubmissionStatus } from '../enums/task-submission-status.enum';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('task_submissions')
export class TaskSubmission {
  @PrimaryGeneratedColumn('uuid')
  task_submission_id: string;

  @Column({ type: 'int4', nullable: true })
  score: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ type: 'varchar', default: TaskSubmissionStatus.NOT_STARTED })
  status: TaskSubmissionStatus;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'uuid', nullable: true })
  graded_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  graded_at: Date;

  @Column('uuid')
  task_attempt_id: string;

  @OneToOne(() => TaskAttempt)
  @JoinColumn({ name: 'task_attempt_id' })
  taskAttempt: TaskAttempt;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'graded_by' })
  grader: User;
}
