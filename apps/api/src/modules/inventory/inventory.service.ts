import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  CreateStockMovementDto,
  StockQueryDto,
  MovementType,
} from './dto';
import { PrismaTransactionClient } from '../../common/interfaces';
import {
  WarehouseNotFoundException,
  ProductNotFoundException,
  InsufficientStockException,
} from '../../common/exceptions';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== WAREHOUSE ====================
  async createWarehouse(dto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({ data: dto });
  }

  async getAllWarehouses() {
    return this.prisma.warehouse.findMany({
      include: {
        _count: { select: { stocks: true } },
      },
    });
  }

  async getWarehouseById(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        stocks: {
          include: { product: true },
        },
      },
    });
    if (!warehouse) throw new WarehouseNotFoundException(id);
    return warehouse;
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    await this.getWarehouseById(id);
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  async deleteWarehouse(id: string) {
    await this.getWarehouseById(id);
    return this.prisma.warehouse.delete({ where: { id } });
  }

  // ==================== CATEGORY ====================
  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async getAllCategories() {
    return this.prisma.category.findMany({
      include: { _count: { select: { products: true } } },
    });
  }

  // ==================== PRODUCT ====================
  async createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: dto,
      include: { category: true },
    });
  }

  async getAllProducts(query: StockQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where = search?.trim()
      ? {
          OR: [
            { name: { contains: search.trim(), mode: 'insensitive' as const } },
            { sku: { contains: search.trim(), mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          stocks: {
            include: { warehouse: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stocks: { include: { warehouse: true } },
        bom: { include: { items: true } },
      },
    });
    if (!product) throw new ProductNotFoundException(id);
    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.getProductById(id);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async deleteProduct(id: string) {
    await this.getProductById(id);
    return this.prisma.product.delete({ where: { id } });
  }

  // ==================== STOCK ====================
  async getStock(query: StockQueryDto) {
    const { warehouseId, productId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StockWhereInput = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;

    const [stocks, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
          warehouse: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.stock.count({ where }),
    ]);

    return {
      data: stocks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLowStockItems(warehouseId?: string) {
    const stocks = await this.prisma.stock.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: {
        product: true,
        warehouse: true,
      },
    });

    return stocks.filter(
      (stock) => stock.quantity <= stock.product.minStockLevel,
    );
  }

  // ==================== STOCK MOVEMENT ====================
  /**
   * Create stock movement with transaction support
   * @param dto Stock movement data
   * @param userId User performing the movement
   * @param tx Optional transaction client for cross-service transactions
   */
  async createStockMovement(
    dto: CreateStockMovementDto,
    userId: string,
    tx?: PrismaTransactionClient,
  ) {
    const { productId, warehouseId, type, quantity, referenceId } = dto;
    if (!userId) {
      throw new BadRequestException('User context required for stock movement');
    }

    // Use transaction client if provided, otherwise use prisma directly
    const client = tx || this.prisma;

    // Get or create stock record
    let stock = await client.stock.findUnique({
      where: {
        productId_warehouseId: { productId, warehouseId },
      },
    });

    if (!stock) {
      stock = await client.stock.create({
        data: {
          productId,
          warehouseId,
          quantity: 0,
          reservedQty: 0,
        },
      });
    }

    // Calculate new quantity based on movement type
    let newQuantity = stock.quantity;
    switch (type) {
      case MovementType.INBOUND:
      case MovementType.PRODUCTION_FINISH:
        newQuantity += quantity;
        break;
      case MovementType.OUTBOUND:
      case MovementType.PRODUCTION_USE:
        if (stock.quantity < quantity) {
          throw new InsufficientStockException(
            productId,
            stock.quantity,
            quantity,
            warehouseId,
          );
        }
        newQuantity -= quantity;
        break;
      case MovementType.ADJUSTMENT:
        newQuantity = quantity; // Direct set for adjustment
        break;
    }

    // If we have external transaction, don't wrap in another transaction
    if (tx) {
      const movement = await client.stockMovement.create({
        data: {
          product: { connect: { id: productId } },
          warehouse: { connect: { id: warehouseId } },
          user: { connect: { id: userId } },
          type,
          quantity,
          referenceId,
        },
        include: {
          product: true,
          warehouse: true,
        },
      });

      await client.stock.update({
        where: { id: stock.id },
        data: { quantity: newQuantity },
      });

      return movement;
    }

    // Create movement and update stock in transaction
    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          product: { connect: { id: productId } },
          warehouse: { connect: { id: warehouseId } },
          user: { connect: { id: userId } },
          type,
          quantity,
          referenceId,
        },
        include: {
          product: true,
          warehouse: true,
        },
      }),
      this.prisma.stock.update({
        where: { id: stock.id },
        data: { quantity: newQuantity },
      }),
    ]);

    return movement;
  }

  async getStockMovements(productId?: string, warehouseId?: string) {
    const where: Prisma.StockMovementWhereInput = {};
    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;

    return this.prisma.stockMovement.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ==================== DASHBOARD STATS ====================
  async getDashboardStats() {
    const [
      totalProducts,
      totalWarehouses,
      lowStockCount,
      totalStockValue,
      recentMovements,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.warehouse.count(),
      this.prisma.stock.count({
        where: {
          quantity: { lte: 0 },
        },
      }),
      this.prisma.stock.findMany({
        include: { product: true },
      }),
      this.prisma.stockMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          warehouse: { select: { name: true } },
        },
      }),
    ]);

    const stockValue = totalStockValue.reduce((acc, stock) => {
      return acc + stock.quantity * stock.product.purchasePrice;
    }, 0);

    return {
      totalProducts,
      totalWarehouses,
      lowStockCount,
      totalStockValue: stockValue,
      recentMovements,
    };
  }
}
