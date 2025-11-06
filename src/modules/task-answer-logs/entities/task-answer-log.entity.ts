import { TaskAttempt } from 'src/modules/task-attempts/entities/task-attempt.entity';
import { TaskQuestion } from 'src/modules/task-questions/entities/task-question.entity';
import { TaskQuestionOption } from 'src/modules/task-question-options/entities/task-question-option.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('task_answer_logs')
export class TaskAnswerLog {
  @PrimaryGeneratedColumn('uuid')
  task_answer_log_id: string;

  @Column({ type: 'text', nullable: true })
  answer_text: string;

  @Column({ type: 'text', nullable: true })
  image: string;

  @Column({ type: 'boolean' })
  is_correct: boolean;

  @Column({ type: 'int4', nullable: true })
  point_awarded: number;

  @Column({ type: 'text', nullable: true })
  teacher_notes: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'uuid' })
  task_attempt_id: string;

  @Column({ type: 'uuid' })
  question_id: string;

  @Column({ type: 'uuid', nullable: true })
  option_id: string;

  @ManyToOne(() => TaskAttempt)
  @JoinColumn({ name: 'task_attempt_id' })
  taskAttempt: TaskAttempt;

  @ManyToOne(() => TaskQuestion)
  @JoinColumn({ name: 'question_id' })
  question: TaskQuestion;

  @ManyToOne(() => TaskQuestionOption)
  @JoinColumn({ name: 'option_id' })
  option: TaskQuestionOption;
}
