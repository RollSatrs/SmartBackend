import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt.guard';

function contextFor(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const user = { id: 1, email: 'user@test.com', role: 'resident' } as const;
  const verify = jest.fn(() => user);
  const guard = new JwtAuthGuard({ verify } as unknown as JwtService);

  beforeEach(() => jest.clearAllMocks());

  it('принимает Bearer-токен мобильного клиента', () => {
    const request = {
      headers: { authorization: 'Bearer mobile-token' },
      cookies: {},
    };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(verify).toHaveBeenCalledWith('mobile-token');
    expect(request).toHaveProperty('user', user);
  });

  it('принимает access_token cookie веб-клиента', () => {
    const request = { headers: {}, cookies: { access_token: 'web-token' } };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(verify).toHaveBeenCalledWith('web-token');
  });

  it('отклоняет запрос без токена', () => {
    expect(() =>
      guard.canActivate(contextFor({ headers: {}, cookies: {} })),
    ).toThrow(UnauthorizedException);
  });
});
