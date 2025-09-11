import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialController } from './materials.controller';
import { MaterialService } from './materials.service';
import { Material } from './entities/material.entity';
import { Subject } from 'src/subjects/entities/subject.entity';
import { MaterialGrade } from 'src/material-grades/entities/material-grade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material, Subject, MaterialGrade])],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService],
})
export class MaterialModule {}
