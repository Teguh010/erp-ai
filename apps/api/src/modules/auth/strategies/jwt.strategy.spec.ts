import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user payload with userId', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@test.com',
        role: 'ADMIN',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        sub: 'user-123',
        userId: 'user-123',
        email: 'test@test.com',
        role: 'ADMIN',
      });
    });

    it('should handle payload with different properties', async () => {
      const payload = {
        sub: 'user-456',
        email: 'another@test.com',
        role: 'USER',
        iat: 1234567890,
        exp: 1234571490,
      };

      const result = await strategy.validate(payload);

      expect(result.userId).toBe('user-456');
      expect(result.email).toBe('another@test.com');
      expect(result.role).toBe('USER');
    });
  });
});

describe('JwtStrategy with fallback secret', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined), // No JWT_SECRET configured
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined even without JWT_SECRET', () => {
    expect(strategy).toBeDefined();
  });
});
