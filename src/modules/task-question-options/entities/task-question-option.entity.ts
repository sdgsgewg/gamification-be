import { TaskAnswerLog } from 'src/modules/task-answer-logs/entities/task-answer-log.entity';
import { TaskQuestion } from 'src/modules/task-questions/entities/task-question.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity('task_question_options')
export class TaskQuestionOption {
  @PrimaryGeneratedColumn('uuid')
  task_question_option_id: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'boolean', default: false })
  is_correct: boolean;

  @Column({ type: 'int', nullable: true })
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
  question_id: string;

  @ManyToOne(() => TaskQuestion)
  @JoinColumn({ name: 'question_id' })
  question: TaskQuestion;

  @OneToMany(() => TaskAnswerLog, (tal) => tal.option)
  taskAnswerLogs: TaskAnswerLog[];
}
