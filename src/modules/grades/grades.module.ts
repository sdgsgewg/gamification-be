import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradeController } from './grades.controller';
import { GradeService } from './grades.service';
import { Grade } from './entities/grade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Grade])],
  controllers: [GradeController],
  providers: [GradeService],
  exports: [GradeService], // <== kalau mau dipakai di module lain
})
export class GradeModule {}
