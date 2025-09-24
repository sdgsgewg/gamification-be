import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/integrations/supabase/supabase.module';
import { JwtModule } from '@nestjs/jwt';
import { MailerService } from './mailer.service';

@Module({
  imports: [SupabaseModule, JwtModule],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
