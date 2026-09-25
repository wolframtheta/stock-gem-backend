import { basename } from 'path';

export const DEFAULT_UPLOAD_PUBLIC_PATH = '/uploads/images';

/** Value persisted in DB / sent back on create-update (filename only). */
export function toStoredUploadFilename(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  let name = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      name = basename(new URL(trimmed).pathname);
    } catch {
      name = basename(trimmed);
    }
  } else if (trimmed.includes('/')) {
    name = basename(trimmed);
  }
  if (!name || name === '.' || name === '..' || name.includes('..')) {
    throw new Error('Invalid upload filename');
  }
  return name;
}

export function toPublicUploadPath(
  stored: string,
  publicPath: string = DEFAULT_UPLOAD_PUBLIC_PATH,
): string {
  const filename = toStoredUploadFilename(stored);
  return `${normalizeUploadPublicPath(publicPath)}/${filename}`;
}

/** URL path (leading slash, no trailing slash) for static files and stored DB paths. */
export function normalizeUploadPublicPath(raw?: string): string {
  const trimmed = (raw ?? DEFAULT_UPLOAD_PUBLIC_PATH).trim();
  if (!trimmed) {
    return DEFAULT_UPLOAD_PUBLIC_PATH;
  }
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const normalized = withLeading.replace(/\/+$/, '');
  return normalized || DEFAULT_UPLOAD_PUBLIC_PATH;
}

/** Nest `@Controller()` path (no leading slash). */
export function uploadNestControllerPath(): string {
  return normalizeUploadPublicPath(process.env.UPLOAD_PUBLIC_PATH).slice(1);
}
