import { registerAs } from '@nestjs/config';
import { join } from 'path';

export default registerAs('upload', () => ({
  dest: process.env.UPLOAD_DEST || join(process.cwd(), 'uploads'),
  maxFileSizeBytes: parseInt(
    process.env.UPLOAD_MAX_FILE_SIZE_BYTES || '5242880',
    10,
  ),
}));
