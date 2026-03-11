import { Test, TestingModule } from '@nestjs/testing';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';
import {
  createTestBOM,
  createTestProduct,
  createTestProductionOrder,
  createTestSupplier,
  createTestPurchaseOrder,
} from '../../test/test-utils';
import { ProductionStatus, POStatus } from './dto';

describe('ProductionController', () => {
  let controller: ProductionController;
  let productionService: jest.Mocked<ProductionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionController],
      providers: [
        {
          provide: ProductionService,
          useValue: {
            createBOM: jest.fn(),
            getAllBOMs: jest.fn(),
            getBOMById: jest.fn(),
            updateBOM: jest.fn(),
            deleteBOM: jest.fn(),
            deleteBOMItem: jest.fn(),
            createProductionOrder: jest.fn(),
            getAllProductionOrders: jest.fn(),
            getProductionOrderById: jest.fn(),
            updateProductionOrder: jest.fn(),
            startProduction: jest.fn(),
            completeProduction: jest.fn(),
            createSupplier: jest.fn(),
            getAllSuppliers: jest.fn(),
            getSupplierById: jest.fn(),
            updateSupplier: jest.fn(),
            deleteSupplier: jest.fn(),
            createPurchaseOrder: jest.fn(),
            getAllPurchaseOrders: jest.fn(),
            getPurchaseOrderById: jest.fn(),
            updatePurchaseOrderStatus: jest.fn(),
            createPackagingReport: jest.fn(),
            getAllPackagingReports: jest.fn(),
            getPackagingReportById: jest.fn(),
            updatePackagingReport: jest.fn(),
            deletePackagingReport: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductionController>(ProductionController);
    productionService = module.get(ProductionService);
  });

  // ==================== BOM ====================
  describe('BOM Endpoints', () => {
    it('should create BOM', async () => {
      const dto = {
        productId: 'product-1',
        items: [{ materialId: 'mat-1', quantity: 5 }],
      };
      const bom = {
        ...createTestBOM(),
        product: createTestProduct(),
        items: [],
      };

      productionService.createBOM.mockResolvedValue(bom);

      const result = await controller.createBOM(dto);

      expect(productionService.createBOM).toHaveBeenCalledWith(dto);
      expect(result).toBeDefined();
    });

    it('should get all BOMs', async () => {
      const boms = [
        { ...createTestBOM(), product: createTestProduct(), items: [] },
      ];
      productionService.getAllBOMs.mockResolvedValue(boms);

      const result = await controller.getAllBOMs();

      expect(result).toHaveLength(1);
    });

    it('should get BOM by id', async () => {
      const bom = {
        ...createTestBOM(),
        product: createTestProduct(),
        items: [],
        productionOrders: [],
      };
      productionService.getBOMById.mockResolvedValue(bom);

      const result = await controller.getBOMById('bom-1');

      expect(result.id).toBe(bom.id);
    });

    it('should update BOM', async () => {
      const dto = { items: [{ materialId: 'mat-2', quantity: 10 }] };
      const bom = {
        ...createTestBOM(),
        product: createTestProduct(),
        items: [],
        productionOrders: [],
      };
      productionService.updateBOM.mockResolvedValue(bom);

      const result = await controller.updateBOM('bom-1', dto);

      expect(productionService.updateBOM).toHaveBeenCalledWith('bom-1', dto);
      expect(result).toBeDefined();
    });

    it('should delete BOM', async () => {
      productionService.deleteBOM.mockResolvedValue({
        id: 'bom-1',
        deleted: true,
      });

      const result = await controller.deleteBOM('bom-1');

      expect(result.deleted).toBe(true);
    });

    it('should delete BOM item', async () => {
      const bom = {
        ...createTestBOM(),
        product: createTestProduct(),
        items: [],
        productionOrders: [],
      };
      productionService.deleteBOMItem.mockResolvedValue(bom);

      const result = await controller.deleteBOMItem('item-1');

      expect(productionService.deleteBOMItem).toHaveBeenCalledWith('item-1');
      expect(result).toBeDefined();
    });
  });

  // ==================== PRODUCTION ORDER ====================
  describe('Production Order Endpoints', () => {
    it('should create production order', async () => {
      const dto = { bomId: 'bom-1', quantity: 100 };
      const order = {
        ...createTestProductionOrder(),
        bom: { ...createTestBOM(), product: createTestProduct(), items: [] },
      };
      productionService.createProductionOrder.mockResolvedValue(order);

      const result = await controller.createProductionOrder(dto);

      expect(productionService.createProductionOrder).toHaveBeenCalledWith(dto);
      expect(result).toBeDefined();
    });

    it('should get all production orders', async () => {
      const orders = [
        {
          ...createTestProductionOrder(),
          bom: { ...createTestBOM(), product: createTestProduct() },
        },
      ];
      productionService.getAllProductionOrders.mockResolvedValue(orders);

      const result = await controller.getAllProductionOrders();

      expect(result).toHaveLength(1);
    });

    it('should get production order by id', async () => {
      const order = {
        ...createTestProductionOrder(),
        bom: { ...createTestBOM(), product: createTestProduct(), items: [] },
      };
      productionService.getProductionOrderById.mockResolvedValue(order);

      const result = await controller.getProductionOrderById('po-1');

      expect(result.id).toBe(order.id);
    });

    it('should update production order', async () => {
      const dto = { status: ProductionStatus.IN_PROGRESS };
      const order = {
        ...createTestProductionOrder({ status: 'IN_PROGRESS' }),
        bom: { ...createTestBOM(), product: createTestProduct() },
      };
      productionService.updateProductionOrder.mockResolvedValue(order);

      const result = await controller.updateProductionOrder('po-1', dto);

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should start production', async () => {
      const order = {
        ...createTestProductionOrder({ status: 'IN_PROGRESS' }),
        bom: { ...createTestBOM(), product: createTestProduct() },
      };
      const req = { user: { sub: 'user-1' } };
      productionService.startProduction.mockResolvedValue(order);

      const result = await controller.startProduction(
        'po-1',
        'warehouse-1',
        req,
      );

      expect(productionService.startProduction).toHaveBeenCalledWith(
        'po-1',
        'warehouse-1',
        'user-1',
      );
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should complete production', async () => {
      const order = {
        ...createTestProductionOrder({ status: 'COMPLETED' }),
        bom: { ...createTestBOM(), product: createTestProduct() },
      };
      const req = { user: { sub: 'user-1' } };
      productionService.completeProduction.mockResolvedValue(order);

      const result = await controller.completeProduction(
        'po-1',
        'warehouse-1',
        req,
      );

      expect(productionService.completeProduction).toHaveBeenCalledWith(
        'po-1',
        'warehouse-1',
        'user-1',
      );
      expect(result.status).toBe('COMPLETED');
    });
  });

  // ==================== SUPPLIER ====================
  describe('Supplier Endpoints', () => {
    it('should create supplier', async () => {
      const dto = { name: 'New Supplier', contact: '08123', email: 's@t.com' };
      const supplier = createTestSupplier(dto);
      productionService.createSupplier.mockResolvedValue(supplier);

      const result = await controller.createSupplier(dto);

      expect(result.name).toBe(dto.name);
    });

    it('should get all suppliers', async () => {
      const suppliers = [createTestSupplier()];
      productionService.getAllSuppliers.mockResolvedValue(suppliers);

      const result = await controller.getAllSuppliers();

      expect(result).toHaveLength(1);
    });

    it('should get supplier by id', async () => {
      const supplier = { ...createTestSupplier(), orders: [] };
      productionService.getSupplierById.mockResolvedValue(supplier);

      const result = await controller.getSupplierById('supplier-1');

      expect(result.id).toBe(supplier.id);
    });

    it('should update supplier', async () => {
      const dto = { name: 'Updated Supplier' };
      const supplier = createTestSupplier(dto);
      productionService.updateSupplier.mockResolvedValue(supplier);

      const result = await controller.updateSupplier('supplier-1', dto);

      expect(result.name).toBe(dto.name);
    });

    it('should delete supplier', async () => {
      const supplier = createTestSupplier();
      productionService.deleteSupplier.mockResolvedValue(supplier);

      const result = await controller.deleteSupplier('supplier-1');

      expect(result.id).toBe(supplier.id);
    });
  });

  // ==================== PURCHASE ORDER ====================
  describe('Purchase Order Endpoints', () => {
    it('should create purchase order', async () => {
      const dto = {
        supplierId: 'supplier-1',
        items: [{ productId: 'prod-1', quantity: 10, unitPrice: 100 }],
      };
      const po = {
        ...createTestPurchaseOrder(),
        supplier: createTestSupplier(),
        items: [],
      };
      productionService.createPurchaseOrder.mockResolvedValue(po);

      const result = await controller.createPurchaseOrder(dto);

      expect(productionService.createPurchaseOrder).toHaveBeenCalledWith(dto);
      expect(result).toBeDefined();
    });

    it('should get all purchase orders', async () => {
      const pos = [
        {
          ...createTestPurchaseOrder(),
          supplier: createTestSupplier(),
          items: [],
        },
      ];
      productionService.getAllPurchaseOrders.mockResolvedValue(pos);

      const result = await controller.getAllPurchaseOrders();

      expect(result).toHaveLength(1);
    });

    it('should get purchase order by id', async () => {
      const po = {
        ...createTestPurchaseOrder(),
        supplier: createTestSupplier(),
        items: [],
      };
      productionService.getPurchaseOrderById.mockResolvedValue(po);

      const result = await controller.getPurchaseOrderById('purchase-1');

      expect(result.id).toBe(po.id);
    });

    it('should update purchase order status', async () => {
      const dto = { status: POStatus.APPROVED };
      const po = {
        ...createTestPurchaseOrder({ status: 'APPROVED' }),
        supplier: createTestSupplier(),
        items: [],
      };
      const req = { user: { sub: 'user-1' } };
      productionService.updatePurchaseOrderStatus.mockResolvedValue(po);

      const result = await controller.updatePurchaseOrderStatus(
        'purchase-1',
        dto,
        undefined,
        req,
      );

      expect(result.status).toBe('APPROVED');
    });

    it('should update purchase order status with warehouse (RECEIVED)', async () => {
      const dto = { status: POStatus.RECEIVED };
      const po = {
        ...createTestPurchaseOrder({ status: 'RECEIVED' }),
        supplier: createTestSupplier(),
        items: [],
      };
      const req = { user: { sub: 'user-1' } };
      productionService.updatePurchaseOrderStatus.mockResolvedValue(po);

      const result = await controller.updatePurchaseOrderStatus(
        'purchase-1',
        dto,
        'warehouse-1',
        req,
      );

      expect(productionService.updatePurchaseOrderStatus).toHaveBeenCalledWith(
        'purchase-1',
        dto,
        'warehouse-1',
        'user-1',
      );
      expect(result.status).toBe('RECEIVED');
    });
  });
});
