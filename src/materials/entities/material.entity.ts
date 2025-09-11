import { MaterialGrade } from 'src/material-grades/entities/material-grade.entity';
import { Subject } from 'src/subjects/entities/subject.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  material_id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column()
  created_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  updated_at: Date;

  @Column({ nullable: true })
  updated_by: string;

  @Column()
  subject_id: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @OneToMany(() => MaterialGrade, (mg) => mg.material)
  materialGrades: MaterialGrade[];
}
