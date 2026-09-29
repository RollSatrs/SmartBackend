import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { MailService } from 'src/mail/mail.service';

const selectMock = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

const insertMock = {
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
};

jest.mock('src', () => ({
  db: {
    select: jest.fn(() => selectMock),
    insert: jest.fn(() => insertMock),
  },
}));

jest.mock('shared/tools/tools', () => ({
  hashFunction: jest.fn((password: string) => `hashed:${password}`),
  unHashFunction: jest.fn(
    (password: string, hash: string) => hash === `hashed:${password}`,
  ),
}));

describe('AuthService', () => {
  let service: AuthService;
  let signMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    signMock = jest.fn(() => 'signed.jwt.token');
    const jwtService = { sign: signMock } as unknown as JwtService;
    const mailService = {} as MailService;
    service = new AuthService(jwtService, mailService);
  });

  describe('login', () => {
    it('бросает UnauthorizedException, если пользователь не найден', async () => {
      selectMock.limit.mockResolvedValueOnce([]);

      await expect(
        service.login({ email: 'unknown@test.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('бросает UnauthorizedException при неверном пароле', async () => {
      selectMock.limit.mockResolvedValueOnce([
        {
          id: 1,
          email: 'user@test.com',
          passwordHash: 'hashed:correct',
          role: 'resident',
        },
      ]);

      await expect(
        service.login({ email: 'user@test.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('возвращает токен и данные пользователя при верных данных', async () => {
      selectMock.limit.mockResolvedValueOnce([
        {
          id: 1,
          fullname: 'Test User',
          email: 'user@test.com',
          passwordHash: 'hashed:correct-password',
          role: 'resident',
        },
      ]);

      const result = await service.login({
        email: 'user@test.com',
        password: 'correct-password',
      });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toMatchObject({
        id: 1,
        name: 'Test User',
        email: 'user@test.com',
      });
      expect(signMock).toHaveBeenCalledWith({
        id: 1,
        email: 'user@test.com',
        role: 'resident',
      });
    });
  });

  describe('register', () => {
    it('бросает ConflictException, если email уже занят', async () => {
      selectMock.limit.mockResolvedValueOnce([{ id: 1 }]);

      await expect(
        service.register({
          name: 'Test',
          email: 'taken@test.com',
          password: 'password123',
          role: 'resident',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('возвращает безопасные данные пользователя и токен', async () => {
      selectMock.limit.mockResolvedValueOnce([]);
      insertMock.returning.mockResolvedValueOnce([
        {
          id: 2,
          fullname: 'New User',
          email: 'new@test.com',
          passwordHash: 'hashed:password123',
          role: 'resident',
          avatar: null,
          createdAt: new Date(),
        },
      ]);

      const result = await service.register({
        name: 'New User',
        email: 'new@test.com',
        password: 'password123',
        role: 'resident',
      });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toEqual({
        id: 2,
        name: 'New User',
        email: 'new@test.com',
        role: 'resident',
        avatar: null,
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });
});
