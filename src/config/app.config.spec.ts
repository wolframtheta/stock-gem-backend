import appConfig from './app.config';

describe('appConfig', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.API_GLOBAL_PREFIX;
    delete process.env.CORS_ORIGIN;
  });

  afterAll(() => {
    process.env = env;
  });

  it('defaults globalPrefix to api', () => {
    expect(appConfig().globalPrefix).toBe('api');
  });

  it('allows empty prefix for reverse proxy strip', () => {
    process.env.API_GLOBAL_PREFIX = '';
    expect(appConfig().globalPrefix).toBe('');
  });

  it('strips slashes from prefix', () => {
    process.env.API_GLOBAL_PREFIX = '/api/';
    expect(appConfig().globalPrefix).toBe('api');
  });
});
