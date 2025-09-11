import { ClassStudent } from 'src/class-students/entities/class-student.entity';
import { Grade } from 'src/grades/entities/grade.entity';
import { TaskAttempt } from 'src/task-attempts/entities/task-attempt.entity';
import { UserSession } from 'src/user-sessions/entities/user-sessions.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column()
  name: string;

  @Column()
  username: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  role: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  dob: Date;

  @Column({ type: 'timestamptz', nullable: true })
  email_verified_at: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ nullable: true })
  level: number;

  @Column({ nullable: true })
  xp: number;

  @Column({ nullable: true })
  grade_id: string;

  @ManyToOne(() => Grade)
  @JoinColumn({ name: 'grade_id' })
  grade: Grade;

  @OneToMany(() => UserSession, (us) => us.user)
  userSessions: UserSession[];

  @OneToMany(() => ClassStudent, (cs) => cs.student)
  classStudents: ClassStudent[];

  @OneToMany(() => TaskAttempt, (ta) => ta.student)
  taskAttempts: TaskAttempt[];
}
