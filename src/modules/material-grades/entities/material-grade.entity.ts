import { Grade } from 'src/modules/grades/entities/grade.entity';
import { Material } from 'src/modules/materials/entities/material.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('material_grades')
export class MaterialGrade {
  @PrimaryGeneratedColumn('uuid')
  material_grade_id: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column()
  material_id: string;

  @Column()
  grade_id: string;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @ManyToOne(() => Grade)
  @JoinColumn({ name: 'grade_id' })
  grade: Grade;
}
