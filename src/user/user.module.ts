import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // <== kalau mau dipakai di module lain
})
export class UserModule {}
