import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  user_session_id: string;

  @Column({ nullable: true })
  device_info: string;

  @Column({ nullable: true })
  refresh_token: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date;

  @Column({ nullable: true })
  is_revoked: boolean;

  @Column({ nullable: true })
  user_id: string;

  @ManyToOne(() => User, (u) => u.userSessions)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
