import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { GradeController } from './grades.controller';
import { GradeService } from './grades.service';

@Module({
  imports: [SupabaseModule],
  controllers: [GradeController],
  providers: [GradeService],
  exports: [GradeService], // <== kalau mau dipakai di module lain
})
export class GradeModule {}
