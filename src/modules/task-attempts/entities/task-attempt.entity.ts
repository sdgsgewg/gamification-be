import { Class } from 'src/modules/classes/entities/class.entity';
import { TaskAnswerLog } from 'src/modules/task-answer-logs/entities/task-answer-log.entity';
import { TaskSubmission } from 'src/modules/task-submissions/entities/task-submission.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { TaskAttemptStatus } from '../enums/task-attempt-status.enum';

@Entity('task_attempts')
export class TaskAttempt {
  @PrimaryGeneratedColumn('uuid')
  task_attempt_id: string;

  @Column({ type: 'int4', nullable: true })
  points: number;

  @Column({ type: 'int4', nullable: true })
  xp_gained: number;

  @Column({ type: 'int4', default: 0, nullable: true })
  answered_question_count: number;

  @Column({ type: 'varchar' })
  status: TaskAttemptStatus;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_accessed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'uuid' })
  task_id: string;

  @Column({ type: 'uuid' })
  student_id: string;

  @Column({ type: 'uuid', nullable: true })
  class_id: string;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @OneToOne(() => TaskSubmission, (ts) => ts.taskAttempt)
  taskSubmission: TaskSubmission;

  @OneToMany(() => TaskAnswerLog, (tal) => tal.taskAttempt)
  taskAnswerLogs: TaskAnswerLog[];
}
