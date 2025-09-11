import { ClassTask } from 'src/class-tasks/entities/class-task.entity';
import { Material } from 'src/materials/entities/material.entity';
import { Subject } from 'src/subjects/entities/subject.entity';
import { TaskAttempt } from 'src/task-attempts/entities/task-attempt.entity';
import { TaskGrade } from 'src/task-grades/entities/task-grade.entity';
import { TaskQuestion } from 'src/task-questions/entities/task-question.entity';
import { TaskType } from 'src/task-types/entities/task-type.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  task_id: string;

  @Column()
  title: string;

  @Column()
  slug: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column()
  start_time: Date;

  @Column()
  end_time: Date;

  @Column()
  is_globally_assigned: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column()
  created_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  updated_at: Date;

  @Column({ nullable: true })
  updated_by: string;

  @Column()
  creator_id: string;

  @Column()
  subject_id: string;

  @Column()
  material_id: string;

  @Column()
  task_type_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @ManyToOne(() => TaskType)
  @JoinColumn({ name: 'task_type_id' })
  taskType: TaskType;

  @OneToMany(() => ClassTask, (cs) => cs.class)
  classTasks: ClassTask[];

  @OneToMany(() => TaskGrade, (tg) => tg.grade)
  taskGrades: TaskGrade[];

  @OneToMany(() => TaskAttempt, (ta) => ta.task)
  taskAttempts: TaskAttempt[];

  @OneToMany(() => TaskQuestion, (tq) => tq.task)
  taskQuestions: TaskQuestion[];
}
