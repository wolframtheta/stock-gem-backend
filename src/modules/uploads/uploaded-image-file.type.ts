/** Minimal multer file shape used by UploadsService (avoids Express.Multer namespace). */
export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}
