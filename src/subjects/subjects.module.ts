import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { SubjectController } from './subjects.controller';
import { SubjectService } from './subjects.service';

@Module({
  imports: [SupabaseModule],
  controllers: [SubjectController],
  providers: [SubjectService],
  exports: [SubjectService], // <== kalau mau dipakai di module lain
})
export class SubjectModule {}
