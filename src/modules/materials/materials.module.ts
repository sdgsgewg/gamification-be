import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialController } from './materials.controller';
import { MaterialService } from './materials.service';
import { Material } from './entities/material.entity';
import { Subject } from 'src/modules/subjects/entities/subject.entity';
import { MaterialGrade } from 'src/modules/material-grades/entities/material-grade.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, Subject, MaterialGrade]),
    CommonModule,
  ],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService],
})
export class MaterialModule {}
