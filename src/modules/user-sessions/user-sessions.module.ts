import { Module } from '@nestjs/common';
import { UserSessionService } from './user-sessions.service';
import { SupabaseModule } from 'src/integrations/supabase/supabase.module';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSession } from './entities/user-sessions.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserSession]) ,SupabaseModule, JwtModule],
  providers: [UserSessionService],
  exports: [UserSessionService],
})
export class UserSessionModule {}
