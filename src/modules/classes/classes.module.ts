import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { CommonModule } from 'src/common/common.module';
import { UserModule } from '../users/users.module';
import { ClassController } from './classes.controller';
import { ClassService } from './classes.service';
import { ClassStudent } from '../class-students/entities/class-student.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Class, ClassStudent]),
    UserModule,
    CommonModule,
  ],
  controllers: [ClassController],
  providers: [ClassService],
  exports: [ClassService],
})
export class ClassModule {}
