import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CommonModule } from 'src/common/common.module';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { RoleModule } from '../roles/roles.module';
import { MasterHistoryModule } from '../master-history/master-history.module';
import { ActivityLogModule } from '../activty-logs/activity-logs.module';
import { UserSession } from '../user-sessions/entities/user-sessions.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSession, TaskAttempt]),
    RoleModule,
    MasterHistoryModule,
    ActivityLogModule,
    CommonModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // <== kalau mau dipakai di module lain
})
export class UserModule {}
