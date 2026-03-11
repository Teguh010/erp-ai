import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import {
  createTestWarehouse,
  createTestProduct,
  createTestCategory,
  createTestStock,
  createTestStockMovement,
} from '../../test/test-utils';
import { MovementType } from './dto';

describe('InventoryController', () => {
  let controller: InventoryController;
  let inventoryService: jest.Mocked<InventoryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: {
            getDashboardStats: jest.fn(),
            createWarehouse: jest.fn(),
            getAllWarehouses: jest.fn(),
            getWarehouseById: jest.fn(),
            updateWarehouse: jest.fn(),
            deleteWarehouse: jest.fn(),
            createCategory: jest.fn(),
            getAllCategories: jest.fn(),
            createProduct: jest.fn(),
            getAllProducts: jest.fn(),
            getProductById: jest.fn(),
            updateProduct: jest.fn(),
            deleteProduct: jest.fn(),
            getStock: jest.fn(),
            getLowStockItems: jest.fn(),
            createStockMovement: jest.fn(),
            getStockMovements: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    inventoryService = module.get(InventoryService);
  });

  // ==================== DASHBOARD ====================
  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      const stats = {
        totalProducts: 100,
        totalWarehouses: 5,
        lowStockCount: 10,
        totalStockValue: 50000,
      };

      inventoryService.getDashboardStats.mockResolvedValue(stats);

      const result = await controller.getDashboardStats();

      expect(result).toMatchObject(stats);
    });
  });

  // ==================== WAREHOUSE ====================
  describe('Warehouse Endpoints', () => {
    it('should create warehouse', async () => {
      const dto = { name: 'New Warehouse', location: 'Jakarta' };
      const warehouse = createTestWarehouse(dto);

      inventoryService.createWarehouse.mockResolvedValue(warehouse);

      const result = await controller.createWarehouse(dto);

      expect(inventoryService.createWarehouse).toHaveBeenCalledWith(dto);
      expect(result.name).toBe(dto.name);
    });

    it('should get all warehouses', async () => {
      const warehouses = [createTestWarehouse()];
      inventoryService.getAllWarehouses.mockResolvedValue(warehouses);

      const result = await controller.getAllWarehouses();

      expect(result).toHaveLength(1);
    });

    it('should get warehouse by id', async () => {
      const warehouse = { ...createTestWarehouse(), stocks: [] };
      inventoryService.getWarehouseById.mockResolvedValue(warehouse);

      const result = await controller.getWarehouseById('warehouse-1');

      expect(inventoryService.getWarehouseById).toHaveBeenCalledWith('warehouse-1');
      expect(result.id).toBe(warehouse.id);
    });

    it('should update warehouse', async () => {
      const dto = { name: 'Updated' };
      const warehouse = createTestWarehouse(dto);

      inventoryService.updateWarehouse.mockResolvedValue(warehouse);

      const result = await controller.updateWarehouse('warehouse-1', dto);

      expect(inventoryService.updateWarehouse).toHaveBeenCalledWith('warehouse-1', dto);
      expect(result.name).toBe(dto.name);
    });

    it('should delete warehouse', async () => {
      const warehouse = createTestWarehouse();
      inventoryService.deleteWarehouse.mockResolvedValue(warehouse);

      const result = await controller.deleteWarehouse('warehouse-1');

      expect(inventoryService.deleteWarehouse).toHaveBeenCalledWith('warehouse-1');
      expect(result.id).toBe(warehouse.id);
    });
  });

  // ==================== CATEGORY ====================
  describe('Category Endpoints', () => {
    it('should create category', async () => {
      const dto = { name: 'Electronics' };
      const category = createTestCategory(dto);

      inventoryService.createCategory.mockResolvedValue(category);

      const result = await controller.createCategory(dto);

      expect(result.name).toBe(dto.name);
    });

    it('should get all categories', async () => {
      const categories = [createTestCategory()];
      inventoryService.getAllCategories.mockResolvedValue(categories);

      const result = await controller.getAllCategories();

      expect(result).toHaveLength(1);
    });
  });

  // ==================== PRODUCT ====================
  describe('Product Endpoints', () => {
    it('should create product', async () => {
      const dto = {
        sku: 'SKU-001',
        name: 'Test Product',
        categoryId: 'cat-1',
        unit: 'pcs',
        purchasePrice: 100,
      };
      const product = { ...createTestProduct(dto), category: createTestCategory() };

      inventoryService.createProduct.mockResolvedValue(product);

      const result = await controller.createProduct(dto);

      expect(result.sku).toBe(dto.sku);
    });

    it('should get all products with pagination', async () => {
      const query = { page: 1, limit: 20 };
      const response = {
        data: [{ ...createTestProduct(), category: createTestCategory(), stocks: [] }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      inventoryService.getAllProducts.mockResolvedValue(response);

      const result = await controller.getAllProducts(query);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should get product by id', async () => {
      const product = {
        ...createTestProduct(),
        category: createTestCategory(),
        stocks: [],
        bom: null,
      };

      inventoryService.getProductById.mockResolvedValue(product);

      const result = await controller.getProductById('product-1');

      expect(result.id).toBe(product.id);
    });

    it('should update product', async () => {
      const dto = { name: 'Updated Product' };
      const product = { ...createTestProduct(dto), category: createTestCategory() };

      inventoryService.updateProduct.mockResolvedValue(product);

      const result = await controller.updateProduct('product-1', dto);

      expect(result.name).toBe(dto.name);
    });

    it('should delete product', async () => {
      const product = createTestProduct();
      inventoryService.deleteProduct.mockResolvedValue(product);

      const result = await controller.deleteProduct('product-1');

      expect(result.id).toBe(product.id);
    });
  });

  // ==================== STOCK ====================
  describe('Stock Endpoints', () => {
    it('should get stock with filters', async () => {
      const query = { warehouseId: 'warehouse-1', page: 1, limit: 20 };
      const response = {
        data: [
          {
            ...createTestStock(),
            product: createTestProduct(),
            warehouse: createTestWarehouse(),
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      inventoryService.getStock.mockResolvedValue(response);

      const result = await controller.getStock(query);

      expect(result.data).toHaveLength(1);
    });

    it('should get low stock items', async () => {
      const lowStockItems = [
        {
          ...createTestStock({ quantity: 5 }),
          product: createTestProduct({ minStockLevel: 10 }),
          warehouse: createTestWarehouse(),
        },
      ];

      inventoryService.getLowStockItems.mockResolvedValue(lowStockItems);

      const result = await controller.getLowStockItems({});

      expect(result).toHaveLength(1);
    });
  });

  // ==================== STOCK MOVEMENT ====================
  describe('Stock Movement Endpoints', () => {
    it('should create stock movement', async () => {
      const dto = {
        productId: 'product-1',
        warehouseId: 'warehouse-1',
        type: MovementType.INBOUND,
        quantity: 50,
      };
      const movement = {
        ...createTestStockMovement(dto),
        product: createTestProduct(),
        warehouse: createTestWarehouse(),
      };
      const req = { user: { sub: 'user-1' } };

      inventoryService.createStockMovement.mockResolvedValue(movement);

      const result = await controller.createStockMovement(dto, req);

      expect(inventoryService.createStockMovement).toHaveBeenCalledWith(
        dto,
        'user-1',
      );
      expect(result.type).toBe(dto.type);
    });
  });
});
