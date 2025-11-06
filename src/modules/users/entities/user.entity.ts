import { ClassStudent } from 'src/modules/class-students/entities/class-student.entity';
import { Grade } from 'src/modules/grades/entities/grade.entity';
import { PasswordReset } from 'src/modules/password_resets/entities/password-reset.entity';
import { Role } from 'src/modules/roles/entities/role.entity';
import { TaskAttempt } from 'src/modules/task-attempts/entities/task-attempt.entity';
import { TaskSubmission } from 'src/modules/task-submissions/entities/task-submission.entity';
import { UserSession } from 'src/modules/user-sessions/entities/user-sessions.entity';
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

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  username: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  password: string;

  // @Column({ type: 'varchar' })
  // role: string;

  @Column({ type: 'varchar', nullable: true })
  gender: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  image: string;

  @Column({ type: 'timestamp', nullable: true })
  dob: Date;

  @Column({ type: 'timestamptz', nullable: true })
  email_verified_at: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'int4', nullable: true })
  level: number;

  @Column({ type: 'int4', nullable: true })
  xp: number;

  @Column({ type: 'uuid' })
  role_id: string;

  @Column({ type: 'uuid', nullable: true })
  grade_id: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Grade)
  @JoinColumn({ name: 'grade_id' })
  grade: Grade;

  @OneToMany(() => UserSession, (us) => us.user)
  userSessions: UserSession[];

  @OneToMany(() => PasswordReset, (us) => us.user)
  passwordResets: PasswordReset[];

  @OneToMany(() => ClassStudent, (cs) => cs.student)
  classStudents: ClassStudent[];

  @OneToMany(() => TaskAttempt, (ta) => ta.student)
  taskAttempts: TaskAttempt[];

  @OneToMany(() => TaskSubmission, (ts) => ts.grader)
  taskSubmissions: TaskSubmission[];
}
