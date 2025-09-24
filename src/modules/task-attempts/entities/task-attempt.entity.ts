import { TaskAnswerLog } from 'src/modules/task-answer-logs/entities/task-answer-log.entity';
import { TaskSubmission } from 'src/modules/task-submissions/entities/task-submission.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryColumn,
  JoinColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
} from 'typeorm';

@Entity('task_attempts')
export class TaskAttempt {
  @PrimaryColumn()
  task_attempt_id: string;

  @Column()
  started_at: Date;

  @Column()
  completed_at: Date;

  @Column()
  points: number;

  @Column()
  xp_gained: number;

  @Column()
  status: string;

  @Column()
  created_at: Date;

  @Column()
  task_id: string;

  @Column()
  student_id: string;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @OneToOne(() => TaskSubmission, (ts) => ts.taskAttempt)
  taskAttempt: TaskSubmission;

  @OneToMany(() => TaskAnswerLog, (tal) => tal.taskAttempt)
  taskAnswerLogs: TaskAnswerLog[];
}
