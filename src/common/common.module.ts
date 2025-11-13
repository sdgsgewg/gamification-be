import { Module } from '@nestjs/common';
import { FileUploadService } from './services/file-upload.service';
import { SupabaseStorageService } from 'src/integrations/supabase/supabase-storage.service';

@Module({
  providers: [FileUploadService, SupabaseStorageService],
  exports: [FileUploadService, SupabaseStorageService],
})
export class CommonModule {}
