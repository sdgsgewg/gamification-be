import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('user_sessions')
export class UserSession {
  @PrimaryColumn()
  user_session_id: string;

  @Column()
  device_info: string;

  @Column()
  refresh_token: string;

  @Column()
  created_at: Date;

  @Column()
  expires_at: Date;

  @Column()
  is_revoked: boolean;

  @Column()
  user_id: string;

  @ManyToOne(() => User, (u) => u.userSessions)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
