import { User } from 'src/modules/users/entities/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  role_id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  normalized_name: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @OneToMany(() => User, (user) => user.grade)
  users: User[];
}
