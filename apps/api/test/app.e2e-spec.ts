import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

describe('App E2E Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/api (GET) should return Hello World', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('Auth Module', () => {
    const testUser = {
      email: `e2e-test-${Date.now()}@test.com`,
      password: 'TestPassword123!',
      fullName: 'E2E Test User',
      roleName: 'USER',
    };
    let accessToken: string;
    let userId: string;

    describe('POST /api/auth/register', () => {
      it('should register a new user', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send(testUser)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('email', testUser.email);
        expect(response.body).not.toHaveProperty('passwordHash');
        userId = response.body.id;
      });

      it('should fail with duplicate email', async () => {
        await request(app.getHttpServer())
          .post('/api/auth/register')
          .send(testUser)
          .expect(409);
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login and return JWT token', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
          .expect(201);

        expect(response.body).toHaveProperty('access_token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(testUser.email);
        accessToken = response.body.access_token;
      });

      it('should fail with invalid credentials', async () => {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword',
          })
          .expect(401);
      });
    });

    describe('GET /api/auth/profile', () => {
      it('should return user profile with valid token', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('email', testUser.email);
      });

      it('should fail without token', async () => {
        await request(app.getHttpServer())
          .get('/api/auth/profile')
          .expect(401);
      });
    });

    // Cleanup after auth tests
    afterAll(async () => {
      if (userId) {
        try {
          await prisma.user.delete({ where: { id: userId } });
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Inventory Module (Authenticated)', () => {
    let accessToken: string;
    let testUserId: string;
    let testRoleId: string;
    let testWarehouseId: string;
    let testCategoryId: string;
    let testProductId: string;

    beforeAll(async () => {
      // Create admin role if not exists
      let role = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
      if (!role) {
        role = await prisma.role.create({ data: { name: 'ADMIN' } });
      }
      testRoleId = role.id;

      // Create test admin user
      const hashedPassword = '$2b$10$KixKvbVfvPNq.u0.Cj6xaergKxQqWqKthLNHxVNT6ZvUWVIflPNlm'; // "password123"
      const user = await prisma.user.create({
        data: {
          email: `admin-e2e-${Date.now()}@test.com`,
          passwordHash: hashedPassword,
          fullName: 'E2E Admin User',
          roleId: testRoleId,
        },
      });
      testUserId = user.id;

      // Login to get token
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: user.email, password: 'password123' });

      accessToken = loginRes.body.access_token;
    });

    afterAll(async () => {
      // Cleanup in reverse order of dependencies
      try {
        if (testProductId) {
          await prisma.product.delete({ where: { id: testProductId } });
        }
        if (testCategoryId) {
          await prisma.category.delete({ where: { id: testCategoryId } });
        }
        if (testWarehouseId) {
          await prisma.warehouse.delete({ where: { id: testWarehouseId } });
        }
        if (testUserId) {
          await prisma.user.delete({ where: { id: testUserId } });
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    describe('Warehouse CRUD', () => {
      it('POST /api/inventory/warehouses - should create warehouse', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/inventory/warehouses')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: 'E2E Test Warehouse', location: 'Jakarta' })
          .expect(201);

        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.name).toBe('E2E Test Warehouse');
        testWarehouseId = response.body.data.id;
      });

      it('GET /api/inventory/warehouses - should list warehouses', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/inventory/warehouses')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('GET /api/inventory/warehouses/:id - should get warehouse by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/inventory/warehouses/${testWarehouseId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data.id).toBe(testWarehouseId);
      });

      it('PUT /api/inventory/warehouses/:id - should update warehouse', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/inventory/warehouses/${testWarehouseId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: 'Updated E2E Warehouse' })
          .expect(200);

        expect(response.body.data.name).toBe('Updated E2E Warehouse');
      });
    });

    describe('Category CRUD', () => {
      it('POST /api/inventory/categories - should create category', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/inventory/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: 'E2E Test Category' })
          .expect(201);

        expect(response.body.data).toHaveProperty('id');
        testCategoryId = response.body.data.id;
      });

      it('GET /api/inventory/categories - should list categories', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/inventory/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('Product CRUD', () => {
      it('POST /api/inventory/products - should create product', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/inventory/products')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            sku: `E2E-SKU-${Date.now()}`,
            name: 'E2E Test Product',
            categoryId: testCategoryId,
            unit: 'pcs',
            purchasePrice: 100,
            salePrice: 150,
            minStockLevel: 10,
          })
          .expect(201);

        expect(response.body.data).toHaveProperty('id');
        testProductId = response.body.data.id;
      });

      it('GET /api/inventory/products - should list products with pagination', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/inventory/products')
          .query({ page: 1, limit: 10 })
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('meta');
        expect(response.body.data.meta).toHaveProperty('total');
      });

      it('GET /api/inventory/products/:id - should get product by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/inventory/products/${testProductId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data.id).toBe(testProductId);
      });
    });

    describe('Stock Operations', () => {
      it('GET /api/inventory/stock - should get stock levels', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/inventory/stock')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('meta');
      });

      it('GET /api/inventory/stock/low - should get low stock items', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/inventory/stock/low')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('Dashboard', () => {
      it('GET /api/inventory/dashboard - should get dashboard stats', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/inventory/dashboard')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toHaveProperty('totalProducts');
        expect(response.body.data).toHaveProperty('totalWarehouses');
      });
    });

    describe('Authorization Tests', () => {
      it('should return 401 without token', async () => {
        await request(app.getHttpServer())
          .get('/api/inventory/warehouses')
          .expect(401);
      });

      it('should return 401 with invalid token', async () => {
        await request(app.getHttpServer())
          .get('/api/inventory/warehouses')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });
  });
});
