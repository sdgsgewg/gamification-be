import { MaterialGrade } from 'src/modules/material-grades/entities/material-grade.entity';
import { TaskGrade } from 'src/modules/task-grades/entities/task-grade.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('grades')
export class Grade {
  @PrimaryGeneratedColumn('uuid')
  grade_id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @OneToMany(() => User, (user) => user.grade)
  users: User[];

  @OneToMany(() => MaterialGrade, (mg) => mg.grade)
  materialGrades: MaterialGrade[];

  @OneToMany(() => TaskGrade, (tg) => tg.grade)
  taskGrades: TaskGrade[];
}
