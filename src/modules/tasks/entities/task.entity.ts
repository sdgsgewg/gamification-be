import { ClassTask } from 'src/modules/class-tasks/entities/class-task.entity';
import { Subject } from 'src/modules/subjects/entities/subject.entity';
import { Material } from 'src/modules/materials/entities/material.entity';
import { TaskType } from 'src/modules/task-types/entities/task-type.entity';
import { TaskAttempt } from 'src/modules/task-attempts/entities/task-attempt.entity';
import { TaskGrade } from 'src/modules/task-grades/entities/task-grade.entity';
import { TaskQuestion } from 'src/modules/task-questions/entities/task-question.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TaskDifficulty } from '../enums/task-difficulty.enum';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  task_id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  image: string;

  @Column({ type: 'timestamptz', nullable: true })
  start_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  end_time: Date;

  @Column({ type: 'varchar', default: TaskDifficulty.MEDIUM })
  difficulty: TaskDifficulty;

  @Column({ type: 'boolean', default: false })
  is_globally_assigned: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'varchar' })
  created_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  updated_at: Date;

  @Column({ type: 'varchar', nullable: true })
  updated_by: string;

  @Column({ type: 'uuid' })
  creator_id: string;

  @Column({ type: 'uuid' })
  subject_id: string;

  @Column({ type: 'uuid', nullable: true })
  material_id: string;

  @Column({ type: 'uuid' })
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

  @OneToMany(() => TaskGrade, (tg) => tg.task)
  taskGrades: TaskGrade[];

  @OneToMany(() => TaskAttempt, (ta) => ta.task)
  taskAttempts: TaskAttempt[];

  @OneToMany(() => TaskQuestion, (tq) => tq.task)
  taskQuestions: TaskQuestion[];
}
