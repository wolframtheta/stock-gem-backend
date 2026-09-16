import {
  extensionForImageMime,
  isAllowedImageMime,
} from './upload-image.util';

describe('upload-image.util', () => {
  describe('isAllowedImageMime', () => {
    it('accepts common image types', () => {
      expect(isAllowedImageMime('image/jpeg')).toBe(true);
      expect(isAllowedImageMime('image/png')).toBe(true);
      expect(isAllowedImageMime('image/webp')).toBe(true);
    });

    it('rejects non-images', () => {
      expect(isAllowedImageMime('application/pdf')).toBe(false);
      expect(isAllowedImageMime('text/plain')).toBe(false);
    });
  });

  describe('extensionForImageMime', () => {
    it('maps mime to extension', () => {
      expect(extensionForImageMime('image/png')).toBe('.png');
    });

    it('returns null for unknown mime', () => {
      expect(extensionForImageMime('application/octet-stream')).toBeNull();
    });
  });
});
