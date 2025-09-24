import { Class } from 'src/modules/class/entities/class.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Entity, Column, PrimaryColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity('class_students')
export class ClassStudent {
  @PrimaryColumn()
  class_student_id: string;

  @Column()
  join_date: Date;

  @Column()
  created_at: Date;

  @Column()
  class_id: string;

  @Column()
  student_id: string;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;
}
