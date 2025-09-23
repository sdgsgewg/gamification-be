import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { SupabaseStorageService } from './supabase-storage.service';

@Module({
  providers: [SupabaseService, SupabaseStorageService],
  exports: [SupabaseService, SupabaseStorageService],
})
export class SupabaseModule {}
