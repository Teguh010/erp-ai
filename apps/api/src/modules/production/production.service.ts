import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  CreateBOMDto,
  UpdateBOMDto,
  CreateProductionOrderDto,
  UpdateProductionOrderDto,
  ProductionStatus,
  CreateSupplierDto,
  UpdateSupplierDto,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderStatusDto,
  POStatus,
  CreatePackagingReportDto,
  UpdatePackagingReportDto,
} from './dto';
import { MovementType } from '../inventory/dto';
import {
  BOMExistsException,
  BOMNotFoundException,
  ProductionOrderNotFoundException,
  InvalidProductionStatusException,
  SupplierNotFoundException,
  PurchaseOrderNotFoundException,
} from '../../common/exceptions';

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  // ==================== BILL OF MATERIALS ====================
  async createBOM(dto: CreateBOMDto) {
    const { productId, items } = dto;

    // Check if product exists and doesn't already have a BOM
    const existing = await this.prisma.billOfMaterials.findUnique({
      where: { productId },
    });
    if (existing) {
      throw new BOMExistsException(productId);
    }

    return this.prisma.billOfMaterials.create({
      data: {
        productId,
        items: {
          create: items.map((item) => ({
            materialId: item.materialId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        product: true,
        items: true,
      },
    });
  }

  async getAllBOMs() {
    return this.prisma.billOfMaterials.findMany({
      include: {
        product: true,
        items: { include: { material: true } },
        _count: { select: { productionOrders: true } },
      },
    });
  }

  async getBOMById(id: string) {
    const bom = await this.prisma.billOfMaterials.findUnique({
      where: { id },
      include: {
        product: true,
        items: { include: { material: true } },
        productionOrders: true,
      },
    });
    if (!bom) throw new BOMNotFoundException(id);
    return bom;
  }

  async updateBOM(id: string, dto: UpdateBOMDto) {
    await this.getBOMById(id);

    // Use transaction to atomically delete existing items and create new ones
    if (dto.items) {
      await this.prisma.$transaction(async (tx) => {
        await tx.bOMItem.deleteMany({ where: { bomId: id } });
        await tx.bOMItem.createMany({
          data: dto.items!.map((item) => ({
            bomId: id,
            materialId: item.materialId,
            quantity: item.quantity,
          })),
        });
      });
    }

    return this.getBOMById(id);
  }

  async deleteBOM(id: string) {
    await this.getBOMById(id);
    await this.prisma.$transaction([
      this.prisma.productionOrder.deleteMany({ where: { bomId: id } }),
      this.prisma.bOMItem.deleteMany({ where: { bomId: id } }),
      this.prisma.billOfMaterials.delete({ where: { id } }),
    ]);
    return { id, deleted: true };
  }

  /** Hapus satu material dari BOM (satu BOMItem) */
  async deleteBOMItem(itemId: string) {
    const item = await this.prisma.bOMItem.findUnique({
      where: { id: itemId },
      include: { bom: true },
    });
    if (!item) throw new NotFoundException('BOM item not found');
    await this.prisma.bOMItem.delete({ where: { id: itemId } });
    return this.getBOMById(item.bomId);
  }

  // ==================== PRODUCTION ORDER ====================
  async createProductionOrder(dto: CreateProductionOrderDto) {
    const { bomId, quantity, scheduledDate } = dto;

    // Verify BOM exists
    await this.getBOMById(bomId);

    return this.prisma.productionOrder.create({
      data: {
        bomId,
        quantity,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      },
      include: {
        bom: {
          include: { product: true, items: true },
        },
      },
    });
  }

  async getAllProductionOrders() {
    return this.prisma.productionOrder.findMany({
      include: {
        bom: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProductionOrderById(id: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: {
        bom: {
          include: { product: true, items: true },
        },
      },
    });
    if (!order) throw new ProductionOrderNotFoundException(id);
    return order;
  }

  async updateProductionOrder(id: string, dto: UpdateProductionOrderDto) {
    await this.getProductionOrderById(id);

    const data: Prisma.ProductionOrderUpdateInput = { ...dto };
    if (dto.scheduledDate) {
      data.scheduledDate = new Date(dto.scheduledDate);
    }
    if (dto.status === ProductionStatus.COMPLETED) {
      data.completedDate = new Date();
    }

    return this.prisma.productionOrder.update({
      where: { id },
      data,
      include: {
        bom: { include: { product: true } },
      },
    });
  }

  async startProduction(orderId: string, warehouseId: string, userId: string) {
    const order = await this.getProductionOrderById(orderId);

    if (order.status !== 'PENDING') {
      throw new InvalidProductionStatusException(
        order.status,
        'PENDING',
        'start production',
      );
    }

    // Use interactive transaction for atomic material consumption
    return this.prisma.$transaction(async (tx) => {
      // Consume materials from warehouse within transaction
      for (const item of order.bom.items) {
        await this.inventoryService.createStockMovement(
          {
            productId: item.materialId,
            warehouseId,
            type: MovementType.PRODUCTION_USE,
            quantity: item.quantity * order.quantity,
            referenceId: order.id,
          },
          userId,
          tx,
        );
      }

      return tx.productionOrder.update({
        where: { id: orderId },
        data: { status: 'IN_PROGRESS' },
        include: { bom: { include: { product: true } } },
      });
    });
  }

  async completeProduction(
    orderId: string,
    warehouseId: string,
    userId: string,
  ) {
    const order = await this.getProductionOrderById(orderId);

    if (order.status !== 'IN_PROGRESS') {
      throw new InvalidProductionStatusException(
        order.status,
        'IN_PROGRESS',
        'complete production',
      );
    }

    // Use interactive transaction for atomic product addition
    return this.prisma.$transaction(async (tx) => {
      // Add finished product to warehouse within transaction
      await this.inventoryService.createStockMovement(
        {
          productId: order.bom.productId,
          warehouseId,
          type: MovementType.PRODUCTION_FINISH,
          quantity: order.quantity,
          referenceId: order.id,
        },
        userId,
        tx,
      );

      return tx.productionOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          completedDate: new Date(),
        },
        include: { bom: { include: { product: true } } },
      });
    });
  }

  // ==================== SUPPLIER ====================
  async createSupplier(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async getAllSuppliers() {
    return this.prisma.supplier.findMany({
      include: { _count: { select: { orders: true } } },
    });
  }

  async getSupplierById(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { orders: true },
    });
    if (!supplier) throw new SupplierNotFoundException(id);
    return supplier;
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto) {
    await this.getSupplierById(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async deleteSupplier(id: string) {
    await this.getSupplierById(id);
    return this.prisma.supplier.delete({ where: { id } });
  }

  // ==================== PURCHASE ORDER ====================
  async createPurchaseOrder(dto: CreatePurchaseOrderDto) {
    const { supplierId, items, title, expectedDeliveryDate, notes } = dto;

    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    return this.prisma.purchaseOrder.create({
      data: {
        supplierId,
        totalAmount,
        title: title ?? null,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        notes: notes ?? null,
        items: {
          create: items.map((item) => {
            const derivedVolAll =
              item.volumePerCartonM3 != null ? item.quantity * item.volumePerCartonM3 : null;
            const volumeAllCartonM3 =
              item.volumeAllCartonM3 != null ? item.volumeAllCartonM3 : derivedVolAll;

            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              volumePerCartonM3: item.volumePerCartonM3 ?? null,
              volumeAllCartonM3,
            };
          }),
        },
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
  }

  async getAllPurchaseOrders() {
    return this.prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPurchaseOrderById(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
    if (!po) throw new PurchaseOrderNotFoundException(id);
    return po;
  }

  async updatePurchaseOrderStatus(
    id: string,
    dto: UpdatePurchaseOrderStatusDto,
    warehouseId?: string,
    userId?: string,
  ) {
    const po = await this.getPurchaseOrderById(id);

    // If receiving goods, use transaction for atomic stock updates
    if (dto.status === POStatus.RECEIVED && warehouseId && userId) {
      return this.prisma.$transaction(async (tx) => {
        for (const item of po.items) {
          await this.inventoryService.createStockMovement(
            {
              productId: item.productId,
              warehouseId,
              type: MovementType.INBOUND,
              quantity: item.quantity,
              referenceId: po.id,
            },
            userId,
            tx,
          );
        }

        return tx.purchaseOrder.update({
          where: { id },
          data: { status: dto.status },
          include: { supplier: true, items: { include: { product: true } } },
        });
      });
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: dto.status },
      include: { supplier: true, items: { include: { product: true } } },
    });
  }

  // ==================== LAPORAN PACKAGING ====================
  async createPackagingReport(dto: CreatePackagingReportDto) {
    return this.prisma.packagingReport.create({
      data: {
        date: new Date(dto.date),
        aktivitas: dto.aktivitas,
        tenagaPerempuan: dto.tenagaPerempuan ?? 0,
        tenagaLaki: dto.tenagaLaki ?? 0,
        hasilPackaging: dto.hasilPackaging ?? 0,
        hpp: dto.hpp ?? 0,
      },
    });
  }

  async getAllPackagingReports(params?: { from?: string; to?: string }) {
    const where: Prisma.PackagingReportWhereInput = {};
    if (params?.from || params?.to) {
      where.date = {};
      if (params.from) where.date.gte = new Date(params.from);
      if (params.to) where.date.lte = new Date(params.to);
    }
    return this.prisma.packagingReport.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async getPackagingReportById(id: string) {
    const report = await this.prisma.packagingReport.findUnique({
      where: { id },
    });
    if (!report) throw new NotFoundException('Packaging report not found');
    return report;
  }

  async updatePackagingReport(id: string, dto: UpdatePackagingReportDto) {
    await this.getPackagingReportById(id);
    const data: Prisma.PackagingReportUpdateInput = { ...dto };
    if (dto.date) data.date = new Date(dto.date);
    return this.prisma.packagingReport.update({
      where: { id },
      data,
    });
  }

  async deletePackagingReport(id: string) {
    await this.getPackagingReportById(id);
    return this.prisma.packagingReport.delete({ where: { id } });
  }
}
