import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (user: any = null): ExecutionContext => ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  });

  it('should return true if no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockExecutionContext();

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should return true if user has required role (string)', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    const context = createMockExecutionContext({ role: 'ADMIN' });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should return true if user role includes required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'MANAGER']);
    const context = createMockExecutionContext({ role: 'MANAGER' });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should return false if user does not have required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    const context = createMockExecutionContext({ role: 'USER' });

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should return false if no user in request', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    const context = createMockExecutionContext(null);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should return false if user has no role', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    const context = createMockExecutionContext({ email: 'test@test.com' });

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should handle role array on user', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    const context = createMockExecutionContext({ role: ['USER', 'ADMIN'] });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should return true for empty roles array', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const context = createMockExecutionContext({ role: 'USER' });

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });
});
