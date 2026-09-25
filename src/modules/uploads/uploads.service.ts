import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  extensionForImageMime,
  isAllowedImageMime,
} from './upload-image.util';
import { UploadedImageFile } from './uploaded-image-file.type';

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {}

  getImagesDirectory(): string {
    const imagesDir = this.configService.get<string>('upload.dest')!;
    mkdirSync(imagesDir, { recursive: true });
    return imagesDir;
  }

  getMaxFileSizeBytes(): number {
    return this.configService.get<number>('upload.maxFileSizeBytes')!;
  }

  saveUploadedImage(file: UploadedImageFile): { filename: string } {
    if (!file) {
      throw new BadRequestException('No s\'ha rebut cap fitxer');
    }

    if (!isAllowedImageMime(file.mimetype)) {
      throw new BadRequestException('Tipus de fitxer no permès');
    }

    const ext = extensionForImageMime(file.mimetype);
    if (!ext) {
      throw new BadRequestException('Tipus de fitxer no permès');
    }

    if (file.size > this.getMaxFileSizeBytes()) {
      throw new BadRequestException('El fitxer supera la mida màxima permesa');
    }

    const filename = `${randomUUID()}${ext}`;
    const imagesDir = this.getImagesDirectory();
    writeFileSync(join(imagesDir, filename), file.buffer);

    return { filename };
  }
}
