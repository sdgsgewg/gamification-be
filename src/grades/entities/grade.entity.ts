import { MaterialGrade } from 'src/material-grades/entities/material-grade.entity';
import { TaskGrade } from 'src/task-grades/entities/task-grade.entity';
import { User } from 'src/users/entities/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('grades')
export class Grade {
  @PrimaryGeneratedColumn('uuid')
  grade_id: string;

  @Column()
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
