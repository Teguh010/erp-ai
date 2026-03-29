import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  createTestUser,
  createTestRole,
} from '../../test/test-utils';
import { JwtPayload } from '../../common/interfaces';
import {
  EmailExistsException,
  InvalidCredentialsException,
} from '../../common/exceptions';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@test.com',
      password: 'password123',
      fullName: 'New User',
      roleName: 'USER',
    };

    it('should successfully register a new user', async () => {
      const hashedPassword = 'hashed_password_123';
      const role = createTestRole();
      const createdUser = createTestUser({
        email: registerDto.email,
        fullName: registerDto.fullName,
        passwordHash: hashedPassword,
      });

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue(role);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          passwordHash: hashedPassword,
          fullName: registerDto.fullName,
          roleId: role.id,
        },
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe(registerDto.email);
    });

    it('should throw EmailExistsException if email already exists', async () => {
      const existingUser = createTestUser({ email: registerDto.email });
      prisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        EmailExistsException,
      );
    });

    it('should create role if it does not exist', async () => {
      const newRole = createTestRole({ name: 'ADMIN' });
      const createdUser = createTestUser({ email: registerDto.email });

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue(null);
      prisma.role.create.mockResolvedValue(newRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue(createdUser);

      await service.register({ ...registerDto, roleName: 'ADMIN' });

      expect(prisma.role.create).toHaveBeenCalledWith({
        data: { name: 'ADMIN' },
      });
    });

    it('should use default role "USER" if roleName not provided', async () => {
      const role = createTestRole({ name: 'USER' });
      const createdUser = createTestUser();
      const userWithRole = { ...createTestUser(), role: role } as any;

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue(role);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue(createdUser);

      const { roleName, ...dtoWithoutRole } = registerDto;
      await service.register(dtoWithoutRole);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'USER' },
      });
    });
  });

  describe('login', () => {
    const loginCredentials = {
      email: 'user@test.com',
      password: 'password123',
    };

    it('should successfully login and return JWT token', async () => {
      const role = createTestRole({ name: 'ADMIN' });
      const user = createTestUser({
        email: loginCredentials.email,
        role,
      } as any);

      prisma.user.findUnique.mockResolvedValue({ ...user, role } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(user);

      const result = await service.login(
        loginCredentials.email,
        loginCredentials.password,
      );

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result.user).toMatchObject({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: role.name,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
        role: role.name,
      });
    });

    it('should throw InvalidCredentialsException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login(loginCredentials.email, loginCredentials.password),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw InvalidCredentialsException if password is incorrect', async () => {
      const user = createTestUser({ email: loginCredentials.email });
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        role: createTestRole(),
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(loginCredentials.email, 'wrong_password'),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should update lastLogin timestamp on successful login', async () => {
      const role = createTestRole();
      const user = createTestUser({ email: loginCredentials.email, role } as any);

      prisma.user.findUnique.mockResolvedValue({ ...user, role } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(user);

      await service.login(loginCredentials.email, loginCredentials.password);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { lastLogin: expect.any(Date) },
      });
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      const user = createTestUser();
      const role = createTestRole();
      const payload: JwtPayload = { sub: user.id, email: user.email, role: role.name };

      prisma.user.findUnique.mockResolvedValue({
        ...user,
        role: role,
      } as ReturnType<typeof createTestUser> & { role: ReturnType<typeof createTestRole> });

      const result = await service.validateUser(payload);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: payload.sub },
        include: { role: true },
      });
      expect(result).toBeDefined();
      expect(result?.id).toBe(user.id);
    });

    it('should return null if user not found', async () => {
      const payload: JwtPayload = { sub: 'non-existent-id', email: 'test@test.com', role: 'USER' };
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });
});
