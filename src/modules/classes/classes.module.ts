import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { CommonModule } from 'src/common/common.module';
import { UserModule } from '../users/users.module';
import { ClassController } from './classes.controller';
import { ClassService } from './classes.service';
import { ClassStudentModule } from '../class-students/class-students.module';
import { ClassGradeModule } from '../class-grades/class-grades.module';
import { MasterHistoryModule } from '../master-history/master-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Class]),
    ClassGradeModule,
    ClassStudentModule,
    UserModule,
    MasterHistoryModule,
    CommonModule,
  ],
  controllers: [ClassController],
  providers: [ClassService],
  exports: [ClassService],
})
export class ClassModule {}
