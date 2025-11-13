import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialGrade } from './entities/material-grade.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaterialGrade]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class MaterialGradeModule {}
