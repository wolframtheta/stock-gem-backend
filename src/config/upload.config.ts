import { registerAs } from '@nestjs/config';
import { join } from 'path';
import { normalizeUploadPublicPath } from './upload-path.util';

export default registerAs('upload', () => ({
  dest: process.env.UPLOAD_DEST || join(process.cwd(), 'data', 'images'),
  publicPath: normalizeUploadPublicPath(process.env.UPLOAD_PUBLIC_PATH),
  maxFileSizeBytes: parseInt(
    process.env.UPLOAD_MAX_FILE_SIZE_BYTES || '5242880',
    10,
  ),
}));
