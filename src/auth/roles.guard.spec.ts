import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function contextFor(role: 'resident' | 'gov_official' | 'admin') {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 1, email: 'user@test.com', role } }),
    }),
  } as ExecutionContext;
}

describe('RolesGuard', () => {
  it('разрешает доступ пользователю с требуемой ролью', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => ['gov_official', 'admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextFor('gov_official'))).toBe(true);
  });

  it('запрещает жителю доступ к эндпоинту госоргана', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => ['gov_official', 'admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(contextFor('resident'))).toThrow(
      ForbiddenException,
    );
  });

  it('запрещает госоргану доступ к эндпоинту только для жителей', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => ['resident']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(contextFor('gov_official'))).toThrow(
      ForbiddenException,
    );
  });
});
