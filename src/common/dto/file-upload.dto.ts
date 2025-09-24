export class FileUploadDto {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  stream?: any;
}

export class UploadResponseDto {
  url: string;
  fileName: string;
  size: number;
  mimetype: string;
}
