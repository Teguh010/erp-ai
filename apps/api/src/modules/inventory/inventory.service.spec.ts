import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import {
  createMockPrismaService,
  createTestWarehouse,
  createTestProduct,
  createTestCategory,
  createTestStock,
  createTestStockMovement,
} from '../../test/test-utils';
import { MovementType } from './dto';
import {
  WarehouseNotFoundException,
  ProductNotFoundException,
  InsufficientStockException,
} from '../../common/exceptions';

// Mock CacheService
const createMockCacheService = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPrefix: jest.fn(),
  getOrSet: jest.fn().mockImplementation((_key, callback) => callback()),
  invalidateProduct: jest.fn(),
  invalidateWarehouse: jest.fn(),
  invalidateStock: jest.fn(),
  invalidateSupplier: jest.fn(),
  invalidateCategory: jest.fn(),
  reset: jest.fn(),
  buildKey: jest.fn(),
});

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let cache: ReturnType<typeof createMockCacheService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    cache = createMockCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== WAREHOUSE TESTS ====================
  describe('Warehouse Operations', () => {
    describe('createWarehouse', () => {
      it('should create a warehouse successfully', async () => {
        const dto = { name: 'New Warehouse', location: 'Bandung' };
        const expectedWarehouse = createTestWarehouse(dto);

        prisma.warehouse.create.mockResolvedValue(expectedWarehouse);

        const result = await service.createWarehouse(dto);

        expect(prisma.warehouse.create).toHaveBeenCalledWith({ data: dto });
        expect(result).toMatchObject(dto);
      });
    });

    describe('getAllWarehouses', () => {
      it('should return all warehouses with stock count', async () => {
        const warehouses = [
          { ...createTestWarehouse(), _count: { stocks: 5 } },
          { ...createTestWarehouse({ id: 'warehouse-2', name: 'Secondary' }), _count: { stocks: 3 } },
        ];

        prisma.warehouse.findMany.mockResolvedValue(warehouses);

        const result = await service.getAllWarehouses();

        expect(result).toHaveLength(2);
      });
    });

    describe('getWarehouseById', () => {
      it('should return warehouse with stocks', async () => {
        const warehouse = {
          ...createTestWarehouse(),
          stocks: [{ ...createTestStock(), product: createTestProduct() }],
        };

        prisma.warehouse.findUnique.mockResolvedValue(warehouse);

        const result = await service.getWarehouseById('warehouse-1');

        expect(result).toMatchObject({ name: warehouse.name });
        expect(result.stocks).toHaveLength(1);
      });

      it('should throw WarehouseNotFoundException if warehouse not found', async () => {
        prisma.warehouse.findUnique.mockResolvedValue(null);

        await expect(service.getWarehouseById('non-existent')).rejects.toThrow(
          WarehouseNotFoundException,
        );
      });
    });

    describe('updateWarehouse', () => {
      it('should update warehouse successfully', async () => {
        const existingWarehouse = {
          ...createTestWarehouse(),
          stocks: [],
        };
        const updatedData = { name: 'Updated Warehouse' };

        prisma.warehouse.findUnique.mockResolvedValue(existingWarehouse);
        prisma.warehouse.update.mockResolvedValue({
          ...existingWarehouse,
          ...updatedData,
        });

        const result = await service.updateWarehouse('warehouse-1', updatedData);

        expect(result.name).toBe(updatedData.name);
      });
    });

    describe('deleteWarehouse', () => {
      it('should delete warehouse successfully', async () => {
        const warehouse = { ...createTestWarehouse(), stocks: [] };

        prisma.warehouse.findUnique.mockResolvedValue(warehouse);
        prisma.warehouse.delete.mockResolvedValue(warehouse);

        const result = await service.deleteWarehouse('warehouse-1');

        expect(prisma.warehouse.delete).toHaveBeenCalledWith({
          where: { id: 'warehouse-1' },
        });
        expect(result.id).toBe(warehouse.id);
      });
    });
  });

  // ==================== CATEGORY TESTS ====================
  describe('Category Operations', () => {
    describe('createCategory', () => {
      it('should create a category successfully', async () => {
        const dto = { name: 'Electronics' };
        const category = createTestCategory(dto);

        prisma.category.create.mockResolvedValue(category);

        const result = await service.createCategory(dto);

        expect(prisma.category.create).toHaveBeenCalledWith({ data: dto });
        expect(result.name).toBe(dto.name);
      });
    });

    describe('getAllCategories', () => {
      it('should return all categories with product count', async () => {
        const categories = [
          { ...createTestCategory(), _count: { products: 10 } },
          { ...createTestCategory({ id: 'cat-2', name: 'Finished Goods' }), _count: { products: 5 } },
        ];

        prisma.category.findMany.mockResolvedValue(categories);

        const result = await service.getAllCategories();

        expect(result).toHaveLength(2);
      });
    });
  });

  // ==================== PRODUCT TESTS ====================
  describe('Product Operations', () => {
    describe('createProduct', () => {
      it('should create a product with category', async () => {
        const dto = {
          sku: 'NEW-SKU-001',
          name: 'New Product',
          categoryId: 'category-1',
          unit: 'pcs',
          purchasePrice: 100,
        };
        const product = {
          ...createTestProduct(dto),
          category: createTestCategory(),
        };

        prisma.product.create.mockResolvedValue(product);

        const result = await service.createProduct(dto);

        expect(prisma.product.create).toHaveBeenCalledWith({
          data: dto,
          include: { category: true },
        });
        expect(result.sku).toBe(dto.sku);
      });
    });

    describe('getAllProducts', () => {
      it('should return paginated products', async () => {
        const products = [
          { ...createTestProduct(), category: createTestCategory(), stocks: [] },
        ];

        prisma.product.findMany.mockResolvedValue(products);
        prisma.product.count.mockResolvedValue(1);

        const result = await service.getAllProducts({ page: 1, limit: 20 });

        expect(result.data).toHaveLength(1);
        expect(result.meta).toMatchObject({
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        });
      });

      it('should filter products by search term', async () => {
        prisma.product.findMany.mockResolvedValue([]);
        prisma.product.count.mockResolvedValue(0);

        await service.getAllProducts({ search: 'test', page: 1, limit: 20 });

        expect(prisma.product.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              OR: [
                { name: { contains: 'test', mode: 'insensitive' } },
                { sku: { contains: 'test', mode: 'insensitive' } },
              ],
            },
          }),
        );
      });
    });

    describe('getProductById', () => {
      it('should return product with all relations', async () => {
        const product = {
          ...createTestProduct(),
          category: createTestCategory(),
          stocks: [],
          bom: null,
        };

        prisma.product.findUnique.mockResolvedValue(product);

        const result = await service.getProductById('product-1');

        expect(result).toBeDefined();
        expect(result.id).toBe(product.id);
      });

      it('should throw ProductNotFoundException if product not found', async () => {
        prisma.product.findUnique.mockResolvedValue(null);

        await expect(service.getProductById('non-existent')).rejects.toThrow(
          ProductNotFoundException,
        );
      });
    });

    describe('updateProduct', () => {
      it('should update product successfully', async () => {
        const product = {
          ...createTestProduct(),
          category: createTestCategory(),
          stocks: [],
          bom: null,
        };
        const updatedData = { name: 'Updated Product Name' };

        prisma.product.findUnique.mockResolvedValue(product);
        prisma.product.update.mockResolvedValue({
          ...product,
          ...updatedData,
        });

        const result = await service.updateProduct('product-1', updatedData);

        expect(result.name).toBe(updatedData.name);
      });
    });

    describe('deleteProduct', () => {
      it('should delete product successfully', async () => {
        const product = {
          ...createTestProduct(),
          category: createTestCategory(),
          stocks: [],
          bom: null,
        };

        prisma.product.findUnique.mockResolvedValue(product);
        prisma.product.delete.mockResolvedValue(product);

        const result = await service.deleteProduct('product-1');

        expect(result.id).toBe(product.id);
      });
    });
  });

  // ==================== STOCK TESTS ====================
  describe('Stock Operations', () => {
    describe('getStock', () => {
      it('should return paginated stock list', async () => {
        const stocks = [
          {
            ...createTestStock(),
            product: createTestProduct(),
            warehouse: createTestWarehouse(),
          },
        ];

        prisma.stock.findMany.mockResolvedValue(stocks);
        prisma.stock.count.mockResolvedValue(1);

        const result = await service.getStock({ page: 1, limit: 20 });

        expect(result.data).toHaveLength(1);
        expect(result.meta.total).toBe(1);
      });

      it('should filter by warehouseId', async () => {
        prisma.stock.findMany.mockResolvedValue([]);
        prisma.stock.count.mockResolvedValue(0);

        await service.getStock({ warehouseId: 'warehouse-1' });

        expect(prisma.stock.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { warehouseId: 'warehouse-1' },
          }),
        );
      });
    });

    describe('getLowStockItems', () => {
      it('should return items with quantity below minimum level', async () => {
        const lowStockItem = {
          ...createTestStock({ quantity: 5 }),
          product: createTestProduct({ minStockLevel: 10 }),
          warehouse: createTestWarehouse(),
        };
        const normalStockItem = {
          ...createTestStock({ id: 'stock-2', quantity: 100 }),
          product: createTestProduct({ id: 'product-2', minStockLevel: 10 }),
          warehouse: createTestWarehouse(),
        };

        prisma.stock.findMany.mockResolvedValue([lowStockItem, normalStockItem]);

        const result = await service.getLowStockItems();

        expect(result).toHaveLength(1);
        expect(result[0].quantity).toBeLessThanOrEqual(result[0].product.minStockLevel);
      });
    });
  });

  // ==================== STOCK MOVEMENT TESTS ====================
  describe('Stock Movement Operations', () => {
    const userId = 'user-1';

    describe('createStockMovement', () => {
      it('should create INBOUND movement and increase stock', async () => {
        const dto = {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.INBOUND,
          quantity: 50,
        };
        const existingStock = createTestStock({ quantity: 100 });
        const movement = {
          ...createTestStockMovement(dto),
          product: createTestProduct(),
          warehouse: createTestWarehouse(),
        };

        prisma.stock.findUnique.mockResolvedValue(existingStock);
        prisma.$transaction.mockResolvedValue([movement, { ...existingStock, quantity: 150 }]);

        const result = await service.createStockMovement(dto, userId);

        expect(result).toBeDefined();
        expect(prisma.$transaction).toHaveBeenCalled();
      });

      it('should create stock record if not exists', async () => {
        const dto = {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.INBOUND,
          quantity: 50,
        };
        const newStock = createTestStock({ quantity: 0 });

        prisma.stock.findUnique.mockResolvedValue(null);
        prisma.stock.create.mockResolvedValue(newStock);
        prisma.$transaction.mockResolvedValue([createTestStockMovement(), newStock]);

        await service.createStockMovement(dto, userId);

        expect(prisma.stock.create).toHaveBeenCalledWith({
          data: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
            quantity: 0,
            reservedQty: 0,
          },
        });
      });

      it('should throw InsufficientStockException for OUTBOUND with insufficient stock', async () => {
        const dto = {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.OUTBOUND,
          quantity: 200,
        };
        const existingStock = createTestStock({ quantity: 100 });

        prisma.stock.findUnique.mockResolvedValue(existingStock);

        await expect(service.createStockMovement(dto, userId)).rejects.toThrow(
          InsufficientStockException,
        );
      });

      it('should throw BadRequestException if userId not provided', async () => {
        const dto = {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.INBOUND,
          quantity: 50,
        };

        await expect(service.createStockMovement(dto, '')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should handle ADJUSTMENT type correctly', async () => {
        const dto = {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.ADJUSTMENT,
          quantity: 75,
        };
        const existingStock = createTestStock({ quantity: 100 });
        const movement = createTestStockMovement(dto);

        prisma.stock.findUnique.mockResolvedValue(existingStock);
        prisma.$transaction.mockResolvedValue([
          { ...movement, product: createTestProduct(), warehouse: createTestWarehouse() },
          { ...existingStock, quantity: 75 },
        ]);

        const result = await service.createStockMovement(dto, userId);

        expect(result).toBeDefined();
      });

      it('should handle PRODUCTION_USE type (decrease stock)', async () => {
        const dto = {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.PRODUCTION_USE,
          quantity: 30,
        };
        const existingStock = createTestStock({ quantity: 100 });

        prisma.stock.findUnique.mockResolvedValue(existingStock);
        prisma.$transaction.mockResolvedValue([
          { ...createTestStockMovement(dto), product: createTestProduct(), warehouse: createTestWarehouse() },
          { ...existingStock, quantity: 70 },
        ]);

        const result = await service.createStockMovement(dto, userId);

        expect(result).toBeDefined();
      });

      it('should handle PRODUCTION_FINISH type (increase stock)', async () => {
        const dto = {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.PRODUCTION_FINISH,
          quantity: 100,
        };
        const existingStock = createTestStock({ quantity: 50 });

        prisma.stock.findUnique.mockResolvedValue(existingStock);
        prisma.$transaction.mockResolvedValue([
          { ...createTestStockMovement(dto), product: createTestProduct(), warehouse: createTestWarehouse() },
          { ...existingStock, quantity: 150 },
        ]);

        const result = await service.createStockMovement(dto, userId);

        expect(result).toBeDefined();
      });
    });

    describe('getStockMovements', () => {
      it('should return stock movements with relations', async () => {
        const movements = [
          {
            ...createTestStockMovement(),
            product: createTestProduct(),
            warehouse: createTestWarehouse(),
            user: { id: 'user-1', fullName: 'Test User', email: 'test@test.com' },
          },
        ];

        prisma.stockMovement.findMany.mockResolvedValue(movements);

        const result = await service.getStockMovements();

        expect(result).toHaveLength(1);
        expect(result[0].user).toBeDefined();
      });

      it('should filter by productId and warehouseId', async () => {
        prisma.stockMovement.findMany.mockResolvedValue([]);

        await service.getStockMovements('product-1', 'warehouse-1');

        expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { productId: 'product-1', warehouseId: 'warehouse-1' },
          }),
        );
      });
    });
  });
});
