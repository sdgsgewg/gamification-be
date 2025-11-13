import { Module } from '@nestjs/common';
import { UserSessionService } from './user-sessions.service';
import { SupabaseModule } from 'src/integrations/supabase/supabase.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [SupabaseModule, JwtModule],
  providers: [UserSessionService],
  exports: [UserSessionService],
})
export class UserSessionModule {}
