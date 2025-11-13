import { TaskAnswerLog } from 'src/modules/task-answer-logs/entities/task-answer-log.entity';
import { TaskQuestionOption } from 'src/modules/task-question-options/entities/task-question-option.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity('task_questions')
export class TaskQuestion {
  @PrimaryGeneratedColumn('uuid')
  task_question_id: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'int' })
  point: number;

  @Column({ type: 'text', nullable: true })
  image: string;

  @Column({ type: 'int', nullable: true })
  time_limit: number;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'varchar' })
  created_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  updated_at: Date;

  @Column({ type: 'varchar', nullable: true })
  updated_by: string;

  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @OneToMany(() => TaskQuestionOption, (tqo) => tqo.question)
  taskQuestionOptions: TaskQuestionOption[];

  @OneToMany(() => TaskAnswerLog, (tal) => tal.question)
  taskAnswerLogs: TaskAnswerLog[];
}
