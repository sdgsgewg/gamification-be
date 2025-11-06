import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { setDataSource } from './common/database/get-db-column.util';
import { SupabaseModule } from './integrations/supabase/supabase.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/users/users.module';
import { AuthModule } from './auth/auth.module';
import { GradeModule } from './modules/grades/grades.module';
import { SubjectModule } from './modules/subjects/subjects.module';
import { MaterialModule } from './modules/materials/materials.module';
import { TaskTypeModule } from './modules/task-types/task-types.module';
import { TaskModule } from './modules/tasks/tasks.module';
import { RoleModule } from './modules/roles/roles.module';
import { TaskQuestionModule } from './modules/task-questions/task-questions.module';
import { TaskQuestionOptionModule } from './modules/task-question-options/task-question-options.module';
import { ActivityModule } from './modules/activities/activities.module';
import { TaskAnswerLogModule } from './modules/task-answer-logs/task-answer-logs.module';
import { TaskAttemptModule } from './modules/task-attempts/task-attempts.module';
import { LeaderboardModule } from './modules/leaderboards/leaderboards.module';
import { ClassModule } from './modules/classes/classes.module';
import { ClassTaskModule } from './modules/class-tasks/class-tasks.module';
import { TaskSubmissionModule } from './modules/task-submissions/task-submissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // autoLoadEntities: true,
        synchronize: true, // ⚠️ jangan pakai di production
      }),
    }),
    SupabaseModule,
    AuthModule,
    RoleModule,
    GradeModule,
    UserModule,
    SubjectModule,
    MaterialModule,
    TaskTypeModule,
    TaskModule,
    TaskQuestionModule,
    TaskQuestionOptionModule,
    ActivityModule,
    TaskAttemptModule,
    TaskAnswerLogModule,
    LeaderboardModule,
    ClassModule,
    ClassTaskModule,
    TaskSubmissionModule
    // tambah module baru di sini
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'APP_BOOTSTRAP_DATASOURCE',
      inject: [getDataSourceToken()],
      useFactory: (dataSource: DataSource) => {
        setDataSource(dataSource); // 🔹 register datasource sekali di sini
        return true;
      },
    },
  ],
})
export class AppModule {}
