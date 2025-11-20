import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from '../classes/entities/class.entity';
import { ClassTask } from '../class-tasks/entities/class-task.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { ClassStudent } from './entities/class-student.entity';
import { ActivityLogModule } from '../activty-logs/activity-logs.module';
import { ClassStudentController } from './class-students.controller';
import { ClassStudentService } from './class-students.service';
import { TaskSubmission } from '../task-submissions/entities/task-submission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassStudent,
      Class,
      ClassTask,
      TaskAttempt,
      TaskSubmission,
    ]),
    ActivityLogModule,
  ],
  controllers: [ClassStudentController],
  providers: [ClassStudentService],
  exports: [ClassStudentService],
})
export class ClassStudentModule {}
