import { Material } from 'src/materials/entities/material.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  subject_id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column()
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

  @OneToMany(() => Material, (m) => m.subject)
  materials: Material[];
}
