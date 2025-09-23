import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import { FileUploadDto } from '../../common/dto/file-upload.dto';

@Injectable()
export class SupabaseStorageService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase credentials not found in environment variables',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Upload file to Supabase storage
   */
  async uploadFile(
    file: FileUploadDto,
    fileName: string,
    bucket: string,
    folder?: string,
  ): Promise<string> {
    try {
      // Generate filename
      const ext = path.extname(file.originalname);
      const fileNameWithExt = folder
        ? `${folder}/${fileName}${ext}`
        : `${fileName}${ext}`;

      // Upload file
      const { error } = await this.supabase.storage
        .from(bucket)
        .upload(fileNameWithExt, file.buffer, {
          contentType: file.mimetype,
          // cacheControl: '3600',
          cacheControl: '0', // biar nggak cache lama
          // upsert: false,
          upsert: true, // biar bisa replace gambar lama
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(fileNameWithExt);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Supabase upload error:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  /**
   * Delete file from Supabase storage
   */
  async deleteFile(publicUrl: string, bucket: string): Promise<void> {
    try {
      // Extract file path from public URL
      const filePath = this.getFilePathFromPublicUrl(publicUrl, bucket);

      console.log('File path from public URL: ', filePath);

      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Supabase delete error:', error);
      throw new Error('Failed to delete file from storage');
    }
  }

  /**
   * Delete all files inside a folder from Supabase storage
   */
  /**
   * Delete all files inside a folder (recursive) from Supabase storage
   */
  async deleteFolder(bucket: string, folderPath: string): Promise<void> {
    try {
      const filesToDelete: string[] = [];

      // Fungsi rekursif untuk collect semua file
      const collectFiles = async (path: string) => {
        const { data: items, error } = await this.supabase.storage
          .from(bucket)
          .list(path);

        if (error) throw new Error(`List failed: ${error.message}`);
        if (!items) return;

        for (const item of items) {
          if (item.name && !item.id) {
            // kalau folder
            await collectFiles(`${path}/${item.name}`);
          } else {
            // kalau file
            filesToDelete.push(path ? `${path}/${item.name}` : item.name);
          }
        }
      };

      await collectFiles(folderPath);

      if (filesToDelete.length === 0) return;

      // Hapus semua file
      const { error: removeError } = await this.supabase.storage
        .from(bucket)
        .remove(filesToDelete);

      if (removeError) {
        throw new Error(`Delete folder failed: ${removeError.message}`);
      }
    } catch (error) {
      console.error('Supabase deleteFolder error:', error);
      throw new Error('Failed to delete folder from storage');
    }
  }

  /**
   * Extract file path from public URL
   */
  private getFilePathFromPublicUrl(publicUrl: string, bucket: string): string {
    try {
      const url = new URL(publicUrl);
      const parts = url.pathname.split(`/${bucket}/`);

      if (parts.length < 2) {
        throw new Error('Invalid public URL format');
      }

      return parts[1];
    } catch (error) {
      console.error('Error: ', error);
      throw new Error('Failed to parse public URL');
    }
  }

  /**
   * Check if file exists in storage
   */
  async fileExists(filePath: string, bucket: string): Promise<boolean> {
    try {
      const { data } = await this.supabase.storage.from(bucket).list('', {
        search: filePath,
      });

      return data && data.length > 0;
    } catch (error) {
      console.error('Error: ', error);
      return false;
    }
  }
}

// Export singleton instance
// export const supabaseStorage = new SupabaseStorageService();
