import { TaskAnswerLog } from 'src/task-answer-logs/entities/task-answer-log.entity';
import { TaskQuestion } from 'src/task-questions/entities/task-question.entity';
import {
  Entity,
  Column,
  PrimaryColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity('task_question_options')
export class TaskQuestionOption {
  @PrimaryColumn()
  task_question_option_id: string;

  @Column()
  text: string;

  @Column()
  is_correct: boolean;

  @Column()
  created_at: Date;

  @Column()
  question_id: string;

  @ManyToOne(() => TaskQuestion)
  @JoinColumn({ name: 'question_id' })
  question: TaskQuestion;

  @OneToMany(() => TaskAnswerLog, (tal) => tal.option)
  taskAnswerLogs: TaskAnswerLog[];
}
