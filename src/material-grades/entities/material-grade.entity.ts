import { Grade } from 'src/grades/entities/grade.entity';
import { Material } from 'src/materials/entities/material.entity';
import { Entity, Column, PrimaryColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity('material_grades')
export class MaterialGrade {
  @PrimaryColumn()
  material_grade_id: string;

  @Column()
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
