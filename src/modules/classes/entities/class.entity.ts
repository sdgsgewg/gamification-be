import { ClassStudent } from 'src/modules/class-students/entities/class-student.entity';
import { ClassTask } from 'src/modules/class-tasks/entities/class-task.entity';
import { TaskAttempt } from 'src/modules/task-attempts/entities/task-attempt.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  class_id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  image: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'varchar' })
  created_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  updated_at: Date;

  @Column({ type: 'varchar', nullable: true })
  updated_by: string;

  @Column({ type: 'uuid' })
  teacher_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @OneToMany(() => ClassStudent, (cs) => cs.class)
  classStudents: ClassStudent[];

  @OneToMany(() => ClassTask, (cs) => cs.class)
  classTasks: ClassTask[];

  @OneToMany(() => TaskAttempt, (ta) => ta.class)
  taskAttempts: TaskAttempt[];
}
