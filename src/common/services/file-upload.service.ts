import { Injectable } from '@nestjs/common';
import { SupabaseStorageService } from 'src/integrations/supabase/supabase-storage.service';
import { FileUploadDto, UploadResponseDto } from '../dto/file-upload.dto';

@Injectable()
export class FileUploadService {
  constructor(private readonly supabaseStorage: SupabaseStorageService) {}

  async uploadImage(
    file: FileUploadDto,
    fileName: string, // pakai id dari data yang mau diupload gambarnya
    bucket: string,
    hasFolder: boolean,
    folder?: string, // pakai id dari parent data (cth: data taskQuestion kirim taskId)
    subfolder?: string,
  ): Promise<UploadResponseDto> {
    try {
      let publicUrl = '';

      if (hasFolder) {
        // Build path: tasks/{taskId}/{subfolder}/uuid.ext
        let folderPath = '';
        if (folder && subfolder) folderPath = `${folder}/${subfolder}`;
        else if (folder) folderPath = `${folder}`;
        else if (subfolder) folderPath = subfolder;

        publicUrl = await this.supabaseStorage.uploadFile(
          file,
          fileName,
          bucket,
          folderPath,
        );
      } else {
        publicUrl = await this.supabaseStorage.uploadFile(
          file,
          fileName,
          bucket,
        );
      }

      return {
        url: publicUrl,
        fileName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  async deleteImage(
    publicUrl: string,
    bucket: string = 'images',
  ): Promise<void> {
    try {
      await this.supabaseStorage.deleteFile(publicUrl, bucket);
    } catch (error) {
      console.warn('Failed to delete image:', error.message);
      // Tidak throw error agar tidak mengganggu flow utama
    }
  }

  async deleteFolder(folderPath: string, bucket: string): Promise<void> {
    try {
      await this.supabaseStorage.deleteFolder(bucket, folderPath);
    } catch (error) {
      console.warn('Failed to delete folder:', error.message);
    }
  }

  // async uploadMultipleImages(
  //   files: FileUploadDto[],
  //   bucket: string = 'images',
  //   folder?: string,
  // ): Promise<UploadResponseDto[]> {
  //   const uploadPromises = files.map((file) =>
  //     this.uploadImage(file, bucket, true, folder),
  //   );

  //   return Promise.all(uploadPromises);
  // }

  /**
   * Convert Express.Multer.File to FileUploadDto
   */
  convertMulterFileToDto(multerFile: Express.Multer.File): FileUploadDto {
    return {
      fieldname: multerFile.fieldname,
      originalname: multerFile.originalname,
      encoding: multerFile.encoding,
      mimetype: multerFile.mimetype,
      buffer: multerFile.buffer,
      size: multerFile.size,
      destination: multerFile.destination,
      filename: multerFile.filename,
      path: multerFile.path,
    };
  }
}
