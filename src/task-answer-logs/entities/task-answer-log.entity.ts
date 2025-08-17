import { TaskAttempt } from 'src/task-attempts/entities/task-attempt.entity';
import { TaskQuestion } from 'src/task-questions/entities/task-question.entity';
import { TaskQuestionOption } from 'src/task-question-options/entities/task-question-option.entity';
import { Entity, Column, PrimaryColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity('task_answer_logs')
export class TaskAnswerLog {
  @PrimaryColumn()
  task_answer_log_id: string;

  @Column({ nullable: true })
  answer_text: string;

  @Column({ nullable: true })
  image: string;

  @Column()
  is_correct: boolean;

  @Column()
  created_at: Date;

  @Column()
  task_attempt_id: string;

  @Column()
  question_id: string;

  @Column({ nullable: true })
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
