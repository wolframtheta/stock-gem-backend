import {
  DEFAULT_UPLOAD_PUBLIC_PATH,
  normalizeUploadPublicPath,
  toPublicUploadPath,
  toStoredUploadFilename,
} from './upload-path.util';

describe('normalizeUploadPublicPath', () => {
  it('defaults when empty', () => {
    expect(normalizeUploadPublicPath()).toBe(DEFAULT_UPLOAD_PUBLIC_PATH);
    expect(normalizeUploadPublicPath('')).toBe(DEFAULT_UPLOAD_PUBLIC_PATH);
  });

  it('adds leading slash and strips trailing slash', () => {
    expect(normalizeUploadPublicPath('media/articles/')).toBe('/media/articles');
    expect(normalizeUploadPublicPath('/uploads/images')).toBe('/uploads/images');
  });
});

describe('toStoredUploadFilename', () => {
  it('keeps bare filename', () => {
    expect(toStoredUploadFilename('abc.jpg')).toBe('abc.jpg');
  });

  it('strips public path prefix', () => {
    expect(toStoredUploadFilename('/uploads/images/abc.jpg')).toBe('abc.jpg');
  });
});

describe('toPublicUploadPath', () => {
  it('builds URL path from stored filename', () => {
    expect(toPublicUploadPath('abc.jpg', '/media/x')).toBe('/media/x/abc.jpg');
  });
});
