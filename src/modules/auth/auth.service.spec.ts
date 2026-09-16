import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User, UserRole } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

describe('AuthService', () => {
  let authService: AuthService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('access-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'jwt.secret': 'test-secret',
        'jwt.expiresIn': '15m',
        'jwt.refreshExpiresIn': '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'secret12',
      name: 'New User',
    };

    const savedUser = {
      id: 'user-id',
      email: registerDto.email,
      name: registerDto.name,
      password: 'hashed',
      role: UserRole.BOTIGA,
      fairId: null,
    };

    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation(
        (data: Partial<User>) => data,
      );
      mockUserRepository.save.mockResolvedValue(savedUser);
      mockRefreshTokenRepository.save.mockResolvedValue({});
    });

    it('always assigns botiga role on public register (never admin)', async () => {
      const dtoWithAdminRole = Object.assign({}, registerDto, {
        role: UserRole.ADMIN,
      });

      const result = await authService.register(dtoWithAdminRole);

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          name: registerDto.name,
          role: UserRole.BOTIGA,
        }),
      );
      expect(result.user.role).toBe(UserRole.BOTIGA);
    });

    it('creates botiga user when role is omitted', async () => {
      const result = await authService.register(registerDto);

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.BOTIGA }),
      );
      expect(result.user.role).toBe(UserRole.BOTIGA);
    });

    it('throws ConflictException when email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
