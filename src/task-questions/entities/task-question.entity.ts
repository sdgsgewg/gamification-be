import { TaskAnswerLog } from 'src/task-answer-logs/entities/task-answer-log.entity';
import { TaskQuestionOption } from 'src/task-question-options/entities/task-question-option.entity';
import { Task } from 'src/tasks/entities/task.entity';
import {
  Entity,
  Column,
  PrimaryColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity('task_questions')
export class TaskQuestion {
  @PrimaryColumn()
  task_question_id: string;

  @Column()
  text: string;

  @Column()
  type: string;

  @Column()
  points: number;

  @Column()
  image: string;

  @Column()
  time_limit: number;

  @Column()
  created_at: Date;

  @Column()
  task_id: string;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @OneToMany(() => TaskQuestionOption, (tqo) => tqo.question)
  taskQuestionOptions: TaskQuestionOption[];

  @OneToMany(() => TaskAnswerLog, (tal) => tal.question)
  taskAnswerLogs: TaskAnswerLog[];
}
