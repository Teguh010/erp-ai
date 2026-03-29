import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductionService } from './production.service';
import { PrismaService } from '../../database/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  createMockPrismaService,
  createTestProduct,
  createTestBOM,
  createTestProductionOrder,
  createTestSupplier,
  createTestPurchaseOrder,
} from '../../test/test-utils';
import { ProductionStatus, POStatus } from './dto';
import {
  BOMExistsException,
  BOMNotFoundException,
  ProductionOrderNotFoundException,
  InvalidProductionStatusException,
  SupplierNotFoundException,
  PurchaseOrderNotFoundException,
} from '../../common/exceptions';

describe('ProductionService', () => {
  let service: ProductionService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let inventoryService: jest.Mocked<InventoryService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: InventoryService,
          useValue: {
            createStockMovement: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductionService>(ProductionService);
    inventoryService = module.get(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== BOM TESTS ====================
  describe('Bill of Materials Operations', () => {
    describe('createBOM', () => {
      it('should create a BOM successfully', async () => {
        const dto = {
          productId: 'product-1',
          items: [
            { materialId: 'material-1', quantity: 2 },
            { materialId: 'material-2', quantity: 3 },
          ],
        };

        const expectedBOM = {
          ...createTestBOM(),
          product: createTestProduct(),
          items: dto.items.map((item, idx) => ({
            id: `item-${idx}`,
            bomId: 'bom-1',
            ...item,
          })),
        };

        prisma.billOfMaterials.findUnique.mockResolvedValue(null);
        prisma.billOfMaterials.create.mockResolvedValue(expectedBOM);

        const result = await service.createBOM(dto);

        expect(prisma.billOfMaterials.create).toHaveBeenCalledWith({
          data: {
            productId: dto.productId,
            items: {
              create: dto.items.map((item) => ({
                materialId: item.materialId,
                quantity: item.quantity,
              })),
            },
          },
          include: { product: true, items: true },
        });
        expect(result.items).toHaveLength(2);
      });

      it('should throw BOMExistsException if product already has BOM', async () => {
        const existingBOM = createTestBOM();
        prisma.billOfMaterials.findUnique.mockResolvedValue(existingBOM);

        const dto = {
          productId: 'product-1',
          items: [{ materialId: 'material-1', quantity: 2 }],
        };

        await expect(service.createBOM(dto)).rejects.toThrow(
          BOMExistsException,
        );
      });
    });

    describe('getAllBOMs', () => {
      it('should return all BOMs with relations', async () => {
        const boms = [
          {
            ...createTestBOM(),
            product: createTestProduct(),
            items: [],
            _count: { productionOrders: 5 },
          },
        ];

        prisma.billOfMaterials.findMany.mockResolvedValue(boms);

        const result = await service.getAllBOMs();

        expect(result).toHaveLength(1);
        expect(prisma.billOfMaterials.findMany).toHaveBeenCalledWith({
          include: {
            product: true,
            items: { include: { material: true } },
            _count: { select: { productionOrders: true } },
          },
        });
      });
    });

    describe('getBOMById', () => {
      it('should return BOM with all relations', async () => {
        const bom = {
          ...createTestBOM(),
          product: createTestProduct(),
          items: [
            {
              id: 'item-1',
              bomId: 'bom-1',
              materialId: 'mat-1',
              quantity: 5,
              material: createTestProduct(),
            },
          ],
          productionOrders: [],
        };

        prisma.billOfMaterials.findUnique.mockResolvedValue(bom);

        const result = await service.getBOMById('bom-1');

        expect(result).toBeDefined();
        expect(result.items).toHaveLength(1);
      });

      it('should throw BOMNotFoundException if BOM not found', async () => {
        prisma.billOfMaterials.findUnique.mockResolvedValue(null);

        await expect(service.getBOMById('non-existent')).rejects.toThrow(
          BOMNotFoundException,
        );
      });
    });

    describe('updateBOM', () => {
      it('should update BOM items', async () => {
        const existingBOM = {
          ...createTestBOM(),
          product: createTestProduct(),
          items: [],
          productionOrders: [],
        };
        const updatedItems = [{ materialId: 'mat-new', quantity: 10 }];

        prisma.billOfMaterials.findUnique.mockResolvedValue(existingBOM);
        prisma.bOMItem.deleteMany.mockResolvedValue({ count: 0 });
        prisma.bOMItem.createMany.mockResolvedValue({ count: 1 });

        await service.updateBOM('bom-1', { items: updatedItems });

        expect(prisma.bOMItem.deleteMany).toHaveBeenCalledWith({
          where: { bomId: 'bom-1' },
        });
        expect(prisma.bOMItem.createMany).toHaveBeenCalledWith({
          data: [{ bomId: 'bom-1', materialId: 'mat-new', quantity: 10 }],
        });
      });
    });

    describe('deleteBOM', () => {
      it('should delete BOM and related records', async () => {
        const bom = {
          ...createTestBOM(),
          product: createTestProduct(),
          items: [],
          productionOrders: [],
        };

        prisma.billOfMaterials.findUnique.mockResolvedValue(bom);
        prisma.$transaction.mockResolvedValue([
          { count: 0 },
          { count: 0 },
          bom,
        ]);

        const result = await service.deleteBOM('bom-1');

        expect(result).toMatchObject({ id: 'bom-1', deleted: true });
      });
    });

    describe('deleteBOMItem', () => {
      it('should delete a single BOM item', async () => {
        const bomItem = {
          id: 'item-1',
          bomId: 'bom-1',
          materialId: 'mat-1',
          quantity: 5,
          bom: createTestBOM(),
        };
        const updatedBOM = {
          ...createTestBOM(),
          product: createTestProduct(),
          items: [],
          productionOrders: [],
        };

        prisma.bOMItem.findUnique.mockResolvedValue(bomItem);
        prisma.bOMItem.delete.mockResolvedValue(bomItem);
        prisma.billOfMaterials.findUnique.mockResolvedValue(updatedBOM);

        const result = await service.deleteBOMItem('item-1');

        expect(prisma.bOMItem.delete).toHaveBeenCalledWith({
          where: { id: 'item-1' },
        });
        expect(result).toBeDefined();
      });

      it('should throw NotFoundException if BOM item not found', async () => {
        prisma.bOMItem.findUnique.mockResolvedValue(null);

        await expect(service.deleteBOMItem('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  // ==================== PRODUCTION ORDER TESTS ====================
  describe('Production Order Operations', () => {
    describe('createProductionOrder', () => {
      it('should create a production order', async () => {
        const dto = {
          bomId: 'bom-1',
          quantity: 100,
          scheduledDate: '2026-04-01',
        };
        const bom = {
          ...createTestBOM(),
          product: createTestProduct(),
          items: [],
          productionOrders: [],
        };
        const order = {
          ...createTestProductionOrder(dto),
          bom: { ...bom, items: [] },
        };

        prisma.billOfMaterials.findUnique.mockResolvedValue(bom);
        prisma.productionOrder.create.mockResolvedValue(order);

        const result = await service.createProductionOrder(dto);

        expect(result).toBeDefined();
        expect(prisma.productionOrder.create).toHaveBeenCalled();
      });
    });

    describe('getAllProductionOrders', () => {
      it('should return all production orders', async () => {
        const orders = [
          {
            ...createTestProductionOrder(),
            bom: { ...createTestBOM(), product: createTestProduct() },
          },
        ];

        prisma.productionOrder.findMany.mockResolvedValue(orders);

        const result = await service.getAllProductionOrders();

        expect(result).toHaveLength(1);
      });
    });

    describe('getProductionOrderById', () => {
      it('should return production order with BOM', async () => {
        const order = {
          ...createTestProductionOrder(),
          bom: {
            ...createTestBOM(),
            product: createTestProduct(),
            items: [],
          },
        };

        prisma.productionOrder.findUnique.mockResolvedValue(order);

        const result = await service.getProductionOrderById('po-1');

        expect(result).toBeDefined();
        expect(result.bom).toBeDefined();
      });

      it('should throw ProductionOrderNotFoundException if order not found', async () => {
        prisma.productionOrder.findUnique.mockResolvedValue(null);

        await expect(
          service.getProductionOrderById('non-existent'),
        ).rejects.toThrow(ProductionOrderNotFoundException);
      });
    });

    describe('updateProductionOrder', () => {
      it('should update production order', async () => {
        const order = {
          ...createTestProductionOrder(),
          bom: { ...createTestBOM(), product: createTestProduct(), items: [] },
        };
        const updateDto = { notes: 'Updated notes' } as any;

        prisma.productionOrder.findUnique.mockResolvedValue(order);
        prisma.productionOrder.update.mockResolvedValue({
          ...order,
          ...updateDto,
        });

        const result = await service.updateProductionOrder('po-1', updateDto);

        expect((result as any).notes).toBe('Updated notes');
      });

      it('should set completedDate when status is COMPLETED', async () => {
        const order = {
          ...createTestProductionOrder({ status: 'IN_PROGRESS' }),
          bom: { ...createTestBOM(), product: createTestProduct(), items: [] },
        };

        prisma.productionOrder.findUnique.mockResolvedValue(order);
        prisma.productionOrder.update.mockResolvedValue({
          ...order,
          status: 'COMPLETED',
          completedDate: new Date(),
        });

        await service.updateProductionOrder('po-1', {
          status: ProductionStatus.COMPLETED,
        });

        expect(prisma.productionOrder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              completedDate: expect.any(Date),
            }),
          }),
        );
      });
    });

    describe('startProduction', () => {
      it('should start production and consume materials', async () => {
        const order = {
          ...createTestProductionOrder({ status: 'PENDING' }),
          bom: {
            ...createTestBOM(),
            product: createTestProduct(),
            items: [
              {
                id: 'item-1',
                bomId: 'bom-1',
                materialId: 'mat-1',
                quantity: 2,
              },
            ],
          },
        };

        prisma.productionOrder.findUnique.mockResolvedValue(order);
        prisma.productionOrder.update.mockResolvedValue({
          ...order,
          status: 'IN_PROGRESS',
        });

        const result = await service.startProduction(
          'po-1',
          'warehouse-1',
          'user-1',
        );

        expect(inventoryService.createStockMovement).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'PRODUCTION_USE',
            quantity: 2 * 100, // item.quantity * order.quantity
          }),
          'user-1',
          prisma, // transaction client (prisma mock is passed as tx)
        );
        expect(result.status).toBe('IN_PROGRESS');
      });

      it('should throw InvalidProductionStatusException if order not PENDING', async () => {
        const order = {
          ...createTestProductionOrder({ status: 'IN_PROGRESS' }),
          bom: { ...createTestBOM(), product: createTestProduct(), items: [] },
        };

        prisma.productionOrder.findUnique.mockResolvedValue(order);

        await expect(
          service.startProduction('po-1', 'warehouse-1', 'user-1'),
        ).rejects.toThrow(InvalidProductionStatusException);
      });
    });

    describe('completeProduction', () => {
      it('should complete production and add finished product to stock', async () => {
        const order = {
          ...createTestProductionOrder({ status: 'IN_PROGRESS', quantity: 50 }),
          bom: {
            ...createTestBOM(),
            productId: 'finished-product-1',
            product: createTestProduct({ id: 'finished-product-1' }),
            items: [],
          },
        };

        prisma.productionOrder.findUnique.mockResolvedValue(order);
        prisma.productionOrder.update.mockResolvedValue({
          ...order,
          status: 'COMPLETED',
          completedDate: new Date(),
        });

        const result = await service.completeProduction(
          'po-1',
          'warehouse-1',
          'user-1',
        );

        expect(inventoryService.createStockMovement).toHaveBeenCalledWith(
          expect.objectContaining({
            productId: 'finished-product-1',
            type: 'PRODUCTION_FINISH',
            quantity: 50,
          }),
          'user-1',
          prisma, // transaction client
        );
        expect(result.status).toBe('COMPLETED');
      });

      it('should throw InvalidProductionStatusException if order not IN_PROGRESS', async () => {
        const order = {
          ...createTestProductionOrder({ status: 'PENDING' }),
          bom: { ...createTestBOM(), product: createTestProduct(), items: [] },
        };

        prisma.productionOrder.findUnique.mockResolvedValue(order);

        await expect(
          service.completeProduction('po-1', 'warehouse-1', 'user-1'),
        ).rejects.toThrow(InvalidProductionStatusException);
      });
    });
  });

  // ==================== SUPPLIER TESTS ====================
  describe('Supplier Operations', () => {
    describe('createSupplier', () => {
      it('should create a supplier', async () => {
        const dto = {
          name: 'New Supplier',
          contact: '08123',
          email: 'sup@test.com',
        };
        const supplier = createTestSupplier(dto);

        prisma.supplier.create.mockResolvedValue(supplier);

        const result = await service.createSupplier(dto);

        expect(result.name).toBe(dto.name);
      });
    });

    describe('getAllSuppliers', () => {
      it('should return all suppliers with order count', async () => {
        const suppliers = [{ ...createTestSupplier(), _count: { orders: 3 } }];

        prisma.supplier.findMany.mockResolvedValue(suppliers);

        const result = await service.getAllSuppliers();

        expect(result).toHaveLength(1);
      });
    });

    describe('getSupplierById', () => {
      it('should return supplier with orders', async () => {
        const supplier = {
          ...createTestSupplier(),
          orders: [createTestPurchaseOrder()],
        };

        prisma.supplier.findUnique.mockResolvedValue(supplier);

        const result = await service.getSupplierById('supplier-1');

        expect(result.orders).toHaveLength(1);
      });

      it('should throw SupplierNotFoundException if supplier not found', async () => {
        prisma.supplier.findUnique.mockResolvedValue(null);

        await expect(service.getSupplierById('non-existent')).rejects.toThrow(
          SupplierNotFoundException,
        );
      });
    });

    describe('updateSupplier', () => {
      it('should update supplier', async () => {
        const supplier = { ...createTestSupplier(), orders: [] };
        const updateDto = { name: 'Updated Supplier' };

        prisma.supplier.findUnique.mockResolvedValue(supplier);
        prisma.supplier.update.mockResolvedValue({
          ...supplier,
          ...updateDto,
        });

        const result = await service.updateSupplier('supplier-1', updateDto);

        expect(result.name).toBe(updateDto.name);
      });
    });

    describe('deleteSupplier', () => {
      it('should delete supplier', async () => {
        const supplier = { ...createTestSupplier(), orders: [] };

        prisma.supplier.findUnique.mockResolvedValue(supplier);
        prisma.supplier.delete.mockResolvedValue(supplier);

        const result = await service.deleteSupplier('supplier-1');

        expect(result.id).toBe(supplier.id);
      });
    });
  });

  // ==================== PURCHASE ORDER TESTS ====================
  describe('Purchase Order Operations', () => {
    describe('createPurchaseOrder', () => {
      it('should create PO with calculated total', async () => {
        const dto = {
          supplierId: 'supplier-1',
          items: [
            { productId: 'prod-1', quantity: 10, unitPrice: 100 },
            { productId: 'prod-2', quantity: 5, unitPrice: 200 },
          ],
        };
        const expectedTotal = 10 * 100 + 5 * 200; // 2000

        const po = {
          ...createTestPurchaseOrder({ totalAmount: expectedTotal }),
          supplier: createTestSupplier(),
          items: dto.items.map((item, idx) => ({
            id: `poi-${idx}`,
            ...item,
            product: createTestProduct({ id: item.productId }),
          })),
        };

        prisma.purchaseOrder.create.mockResolvedValue(po);

        const result = await service.createPurchaseOrder(dto);

        expect(result.totalAmount).toBe(expectedTotal);
        expect(result.items).toHaveLength(2);
      });
    });

    describe('getAllPurchaseOrders', () => {
      it('should return all POs with relations', async () => {
        const pos = [
          {
            ...createTestPurchaseOrder(),
            supplier: createTestSupplier(),
            items: [],
          },
        ];

        prisma.purchaseOrder.findMany.mockResolvedValue(pos);

        const result = await service.getAllPurchaseOrders();

        expect(result).toHaveLength(1);
      });
    });

    describe('getPurchaseOrderById', () => {
      it('should return PO with all relations', async () => {
        const po = {
          ...createTestPurchaseOrder(),
          supplier: createTestSupplier(),
          items: [
            {
              id: 'poi-1',
              productId: 'prod-1',
              quantity: 10,
              unitPrice: 100,
              product: createTestProduct(),
            },
          ],
        };

        prisma.purchaseOrder.findUnique.mockResolvedValue(po);

        const result = await service.getPurchaseOrderById('purchase-1');

        expect(result.items).toHaveLength(1);
      });

      it('should throw PurchaseOrderNotFoundException if PO not found', async () => {
        prisma.purchaseOrder.findUnique.mockResolvedValue(null);

        await expect(
          service.getPurchaseOrderById('non-existent'),
        ).rejects.toThrow(PurchaseOrderNotFoundException);
      });
    });

    describe('updatePurchaseOrderStatus', () => {
      it('should update PO status', async () => {
        const po = {
          ...createTestPurchaseOrder({ status: 'DRAFT' }),
          supplier: createTestSupplier(),
          items: [],
        };

        prisma.purchaseOrder.findUnique.mockResolvedValue(po);
        prisma.purchaseOrder.update.mockResolvedValue({
          ...po,
          status: 'APPROVED',
        });

        const result = await service.updatePurchaseOrderStatus('purchase-1', {
          status: POStatus.APPROVED,
        });

        expect(result.status).toBe('APPROVED');
      });

      it('should create stock movements when status is RECEIVED', async () => {
        const po = {
          ...createTestPurchaseOrder({ status: 'APPROVED' }),
          supplier: createTestSupplier(),
          items: [
            {
              id: 'poi-1',
              productId: 'prod-1',
              quantity: 20,
              unitPrice: 100,
              product: createTestProduct(),
            },
          ],
        };

        prisma.purchaseOrder.findUnique.mockResolvedValue(po);
        prisma.purchaseOrder.update.mockResolvedValue({
          ...po,
          status: 'RECEIVED',
        });

        await service.updatePurchaseOrderStatus(
          'purchase-1',
          { status: POStatus.RECEIVED },
          'warehouse-1',
          'user-1',
        );

        expect(inventoryService.createStockMovement).toHaveBeenCalledWith(
          expect.objectContaining({
            productId: 'prod-1',
            type: 'INBOUND',
            quantity: 20,
          }),
          'user-1',
          prisma, // transaction client
        );
      });
    });
  });
});
