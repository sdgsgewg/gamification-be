import { Material } from 'src/materials/entities/material.entity';
import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';

@Entity('subjects')
export class Subject {
  @PrimaryColumn()
  subject_id: string;

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

  @OneToMany(() => Material, (m) => m.subject)
  materials: Material[];
}
