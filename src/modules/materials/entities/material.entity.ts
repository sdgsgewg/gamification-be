import { Subject } from 'src/modules/subjects/entities/subject.entity';
import { MaterialGrade } from 'src/modules/material-grades/entities/material-grade.entity';

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

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  image: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'varchar' })
  created_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  updated_at: Date;

  @Column({ type: 'varchar', nullable: true })
  updated_by: string;

  @Column({ type: 'uuid' })
  subject_id: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @OneToMany(() => MaterialGrade, (mg) => mg.material)
  materialGrades: MaterialGrade[];
}
