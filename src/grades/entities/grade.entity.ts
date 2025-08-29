import { Expose } from 'class-transformer';
import { MaterialGrade } from 'src/material-grades/entities/material-grade.entity';
import { TaskGrade } from 'src/task-grades/entities/task-grade.entity';
import { User } from 'src/users/entities/user.entity';
import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';

@Entity('grades')
export class Grade {
  @PrimaryColumn()
  @Expose({ name: 'gradeId' }) // Transformasi: grade_id -> gradeId
  grade_id: string;

  @Column()
  @Expose() // Kolom name tetap sama
  name: string;

  @Column()
  created_at: string; // Tidak di-@Expose, jadi tidak akan muncul di response

  // Relasi tidak perlu di-@Expose jika tidak ingin ditampilkan
  @OneToMany(() => User, (user) => user.grade)
  users: User[];

  @OneToMany(() => MaterialGrade, (mg) => mg.grade)
  materialGrades: MaterialGrade[];

  @OneToMany(() => TaskGrade, (tg) => tg.grade)
  taskGrades: TaskGrade[];
}
