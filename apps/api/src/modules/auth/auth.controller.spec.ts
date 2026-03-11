import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { createTestUser, createTestRole } from '../../test/test-utils';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('register', () => {
    it('should call authService.register with correct data', async () => {
      const registerDto = {
        email: 'new@test.com',
        password: 'password123',
        fullName: 'New User',
        roleName: 'USER',
      };
      const expectedUser = createTestUser({ email: registerDto.email });

      authService.register.mockResolvedValue(expectedUser);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result.email).toBe(registerDto.email);
    });
  });

  describe('login', () => {
    it('should return access token on successful login', async () => {
      const loginDto = { email: 'user@test.com', password: 'password123' };
      const expectedResponse = {
        access_token: 'jwt-token',
        user: {
          id: 'user-1',
          email: loginDto.email,
          fullName: 'Test User',
          role: 'USER',
        },
      };

      authService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(result.access_token).toBeDefined();
    });
  });

  describe('getProfile', () => {
    it('should return user from request', () => {
      const user = { ...createTestUser(), role: createTestRole() };
      const req = { user };

      const result = controller.getProfile(req);

      expect(result).toEqual(user);
    });
  });
});
