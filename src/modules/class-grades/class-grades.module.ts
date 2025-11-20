import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassGrade } from './entity/class-grade.entity';
import { ClassGradeService } from './class-grades.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClassGrade])],
  controllers: [],
  providers: [ClassGradeService],
  exports: [ClassGradeService],
})
export class ClassGradeModule {}
