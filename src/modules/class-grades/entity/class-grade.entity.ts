import { Class } from 'src/modules/classes/entities/class.entity';
import { Grade } from 'src/modules/grades/entities/grade.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('class_grades')
export class ClassGrade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({ name: 'class_id', type: 'uuid' })
  classId: string;

  @Column({ name: 'grade_id', type: 'uuid' })
  gradeId: string;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => Grade)
  @JoinColumn({ name: 'grade_id' })
  grade: Grade;
}
