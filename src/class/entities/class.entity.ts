import { ClassStudent } from 'src/class-students/entities/class-student.entity';
import { ClassTask } from 'src/class-tasks/entities/class-task.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('classes')
export class Class {
  @PrimaryColumn()
  class_id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column()
  description: string;

  @Column()
  image: string;

  @Column()
  created_at: string;

  @Column()
  teacher_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'teacher_id' })
  user: User;

  @OneToMany(() => ClassStudent, (cs) => cs.class)
  classStudents: ClassStudent[];

  @OneToMany(() => ClassTask, (cs) => cs.class)
  classTasks: ClassTask[];
}
