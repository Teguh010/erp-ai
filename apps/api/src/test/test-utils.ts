import {
  PrismaClient,
  MovementType,
  ProductionStatus,
  POStatus,
} from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

export type MockPrismaService = DeepMockProxy<PrismaClient>;

export const createMockPrismaService = (): MockPrismaService => {
  const mock = mockDeep<PrismaClient>();

  // Configure $transaction to execute callback with the mock itself
  // This supports both batch queries and interactive transactions
  mock.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      // Interactive transaction: execute callback with mock as tx client
      return arg(mock);
    }
    // Batch transaction: return array of query results
    return Promise.all(arg as Promise<unknown>[]);
  });

  return mock;
};

// Factory functions for creating test data
export const createTestUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: '$2b$10$hashedpassword',
  fullName: 'Test User',
  roleId: 'role-1',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLogin: null,
  deletedAt: null,
  ...overrides,
});

export const createTestRole = (overrides = {}) => ({
  id: 'role-1',
  name: 'USER',
  permissions: null,
  ...overrides,
});

export const createTestWarehouse = (overrides = {}) => ({
  id: 'warehouse-1',
  name: 'Main Warehouse',
  location: 'Jakarta',
  deletedAt: null,
  ...overrides,
});

export const createTestCategory = (overrides = {}) => ({
  id: 'category-1',
  name: 'Raw Materials',
  deletedAt: null,
  ...overrides,
});

export const createTestProduct = (overrides = {}) => ({
  id: 'product-1',
  name: 'Test Product',
  categoryId: 'category-1',
  unitId: 'unit-1',
  purchasePrice: 100,
  salePrice: 150,
  deletedAt: null,
  ...overrides,
});

export const createTestStock = (overrides = {}) => ({
  id: 'stock-1',
  productId: 'product-1',
  warehouseId: 'warehouse-1',
  quantity: 100,
  reservedQty: 0,
  updatedAt: new Date(),
  ...overrides,
});

export const createTestStockMovement = (overrides = {}) => ({
  id: 'movement-1',
  productId: 'product-1',
  warehouseId: 'warehouse-1',
  type: MovementType.INBOUND,
  quantity: 50,
  referenceId: null,
  userId: 'user-1',
  createdAt: new Date(),
  ...overrides,
});

export const createTestBOM = (overrides = {}) => ({
  id: 'bom-1',
  productId: 'product-1',
  ...overrides,
});

export const createTestProductionOrder = (overrides = {}) => ({
  id: 'po-1',
  bomId: 'bom-1',
  quantity: 100,
  status: ProductionStatus.PENDING,
  scheduledDate: null,
  completedDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestSupplier = (overrides = {}) => ({
  id: 'supplier-1',
  name: 'Test Supplier',
  contact: '08123456789',
  email: 'supplier@test.com',
  deletedAt: null,
  ...overrides,
});

export const createTestPurchaseOrder = (overrides = {}) => ({
  id: 'purchase-1',
  supplierId: 'supplier-1',
  status: POStatus.DRAFT,
  totalAmount: 1000,
  createdAt: new Date(),
  ...overrides,
});
