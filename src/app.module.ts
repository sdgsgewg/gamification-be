import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GradeModule } from './grades/grades.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // agar bisa diakses di semua module
    }),
    SupabaseModule,
    AuthModule,
    GradeModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
