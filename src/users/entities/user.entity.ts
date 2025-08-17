import { ClassStudent } from 'src/class-students/entities/class-student.entity';
import { Grade } from 'src/grades/entities/grade.entity';
import { TaskAttempt } from 'src/task-attempts/entities/task-attempt.entity';
import { UserSession } from 'src/user-sessions/entities/user-sessions.entity';
import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn()
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

  @Column({ nullable: true })
  email_verified_at: Date;

  @Column()
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
