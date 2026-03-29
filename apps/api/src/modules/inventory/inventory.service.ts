import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  CreateUnitDto,
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
import {
  CacheService,
  CachePrefix,
  CacheTTL,
} from '../cache/cache.service';
import {
  CursorPagination,
  CursorPaginatedResponse,
  SortOrder,
} from '../../common/pagination';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // ==================== WAREHOUSE ====================
  async createWarehouse(dto: CreateWarehouseDto) {
    const warehouse = await this.prisma.warehouse.create({ data: dto });
    await this.cache.delByPrefix(CachePrefix.WAREHOUSES_LIST);
    return warehouse;
  }

  async getAllWarehouses() {
    return this.cache.getOrSet(
      CachePrefix.WAREHOUSES_LIST,
      async () => {
        return this.prisma.warehouse.findMany({
          include: {
            _count: { select: { stocks: true } },
          },
        });
      },
      CacheTTL.LONG,
    );
  }

  async getWarehouseById(id: string) {
    const cacheKey = `${CachePrefix.WAREHOUSE}${id}`;

    const warehouse = await this.cache.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.warehouse.findUnique({
          where: { id },
          include: {
            stocks: {
              include: { product: true },
            },
          },
        });
      },
      CacheTTL.MEDIUM,
    );

    if (!warehouse) throw new WarehouseNotFoundException(id);
    return warehouse;
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    await this.getWarehouseById(id);
    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: dto,
    });
    await this.cache.invalidateWarehouse(id);
    return warehouse;
  }

  async deleteWarehouse(id: string) {
    await this.getWarehouseById(id);
    const warehouse = await this.prisma.warehouse.delete({ where: { id } });
    await this.cache.invalidateWarehouse(id);
    return warehouse;
  }

  // ==================== CATEGORY ====================
  async createCategory(dto: CreateCategoryDto) {
    const category = await this.prisma.category.create({ data: dto });
    await this.cache.del(CachePrefix.CATEGORIES_LIST);
    return category;
  }

  async getAllCategories() {
    return this.cache.getOrSet(
      CachePrefix.CATEGORIES_LIST,
      async () => {
        return this.prisma.category.findMany({
          include: { _count: { select: { products: true } } },
        });
      },
      CacheTTL.LONG,
    );
  }

  // ==================== UNIT ====================
  async createUnit(dto: CreateUnitDto) {
    return this.prisma.unit.create({ data: dto });
  }

  async getAllUnits() {
    return this.prisma.unit.findMany({ orderBy: { name: 'asc' } });
  }

  // ==================== PRODUCT ====================
  async createProduct(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: dto,
      include: { category: true, unit: true },
    });
    await this.cache.delByPrefix(CachePrefix.PRODUCTS_LIST);
    return product;
  }

  async getAllProducts(query: StockQueryDto) {
    const { page = 1, limit = 20, search, cursor } = query;

    // Use cursor-based pagination if cursor is provided
    if (cursor) {
      return this.getProductsWithCursor(cursor, limit, search);
    }

    // Fallback to offset-based pagination
    const skip = (page - 1) * limit;
    const cacheKey = `${CachePrefix.PRODUCTS_LIST}${page}:${limit}:${search || ''}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const where = this.buildProductSearchWhere(search);

        const [products, total] = await Promise.all([
          this.prisma.product.findMany({
            where,
            skip,
            take: limit,
            include: {
              category: true,
              unit: true,
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
      },
      CacheTTL.SHORT,
    );
  }

  /**
   * Get products with cursor-based pagination
   */
  async getProductsWithCursor(
    cursor: string | undefined,
    limit: number = 20,
    search?: string,
  ) {
    const where = this.buildProductSearchWhere(search);
    const cursorQuery = CursorPagination.buildCursorQuery<{ id: string }>(cursor);

    const products = await this.prisma.product.findMany({
      where,
      ...cursorQuery,
      take: limit + 1,
      include: {
        category: true,
        unit: true,
        stocks: {
          include: { warehouse: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return CursorPagination.buildResult(products, limit);
  }

  /**
   * Build search where clause for products
   */
  private buildProductSearchWhere(search?: string): Prisma.ProductWhereInput | undefined {
    if (!search?.trim()) return undefined;

    return {
      name: { contains: search.trim() },
    };
  }

  async getProductById(id: string) {
    const cacheKey = `${CachePrefix.PRODUCT}${id}`;

    const product = await this.cache.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.product.findUnique({
          where: { id },
          include: {
            category: true,
            unit: true,
            stocks: { include: { warehouse: true } },
            bom: { include: { items: true } },
          },
        });
      },
      CacheTTL.MEDIUM,
    );

    if (!product) throw new ProductNotFoundException(id);
    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.getProductById(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, unit: true },
    });
    await this.cache.invalidateProduct(id);
    return product;
  }

  async deleteProduct(id: string) {
    await this.getProductById(id);
    const product = await this.prisma.product.delete({ where: { id } });
    await this.cache.invalidateProduct(id);
    return product;
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
    // minStockLevel has been removed — return empty for now
    return [];
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
          product: { select: { name: true } },
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
