import { MaterialGrade } from 'src/material-grades/entities/material-grade.entity';
import { Subject } from 'src/subjects/entities/subject.entity';
import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('materials')
export class Material {
  @PrimaryColumn()
  material_id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column()
  created_at: Date;

  @Column()
  subject_id: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @OneToMany(() => MaterialGrade, (mg) => mg.material)
  materialGrades: MaterialGrade[];
}
