import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MovementType } from '../inventory/dto';
import { InventoryService } from '../inventory/inventory.service';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderStatusDto,
  CreateCustomerDto,
  PatchSalesOrderMilestonesDto,
} from './dto/sales.dto';
import { SalesOrderStatus } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async createCustomer(data: CreateCustomerDto) {
    return this.prisma.customer.create({ data });
  }

  async getAllCustomers() {
    return this.prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSalesOrders() {
    return this.prisma.salesOrder.findMany({
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSalesOrderById(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Sales Order ${id} not found`);
    }

    return order;
  }

  async createSalesOrder(data: CreateSalesOrderDto) {
    // Calculate total amount
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    return this.prisma.salesOrder.create({
      data: {
        customerId: data.customerId,
        totalAmount,
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { customer: true, items: true },
    });
  }

  async updateSalesOrderStatus(id: string, updateDto: UpdateSalesOrderStatusDto, userId: string) {
    const order = await this.getSalesOrderById(id);

    // If changing to SHIPPED and previously not SHIPPED/COMPLETED
    if (updateDto.status === SalesOrderStatus.SHIPPED && order.status !== SalesOrderStatus.SHIPPED && order.status !== SalesOrderStatus.COMPLETED) {
      // Find the Gudang Utama or fallback
      const warehouses = await this.prisma.warehouse.findMany();
      if (warehouses.length === 0) {
         throw new BadRequestException('No warehouse found to deduct stock from');
      }
      const warehouseId = warehouses[0].id;

      // Deduct stock via inventory service
      for (const item of order.items) {
        await this.inventoryService.createStockMovement({
          productId: item.productId,
          warehouseId,
          type: MovementType.OUTBOUND,
          quantity: item.quantity,
          referenceId: `SO-${order.id.substring(0, 8).toUpperCase()}`,
        }, userId);
      }
    }

    const dataToUpdate: any = { status: updateDto.status };
    
    if (updateDto.shippingDate) {
      dataToUpdate.shippingDate = new Date(updateDto.shippingDate);
    }
    if (updateDto.receivedDate) {
      dataToUpdate.receivedDate = new Date(updateDto.receivedDate);
    }
    if (updateDto.productReviewDate) {
      dataToUpdate.productReviewDate = new Date(updateDto.productReviewDate);
    }
    if (updateDto.poReceivedDate) {
      dataToUpdate.poReceivedDate = new Date(updateDto.poReceivedDate);
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: dataToUpdate,
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  }

  async patchSalesOrderMilestones(id: string, dto: PatchSalesOrderMilestonesDto) {
    await this.getSalesOrderById(id);

    const hasAny = [
      dto.shippingDate,
      dto.receivedDate,
      dto.productReviewDate,
      dto.poReceivedDate,
      dto.expectedDeliveryDate,
    ].some(v => v !== undefined);

    if (!hasAny) {
      throw new BadRequestException('At least one field must be provided');
    }

    const data: Record<string, Date | null> = {};
    if (dto.expectedDeliveryDate !== undefined) {
      data.expectedDeliveryDate =
        dto.expectedDeliveryDate === null || dto.expectedDeliveryDate === ''
          ? null
          : new Date(dto.expectedDeliveryDate);
    }
    if (dto.shippingDate !== undefined) {
      data.shippingDate = new Date(dto.shippingDate);
    }
    if (dto.receivedDate !== undefined) {
      data.receivedDate = new Date(dto.receivedDate);
    }
    if (dto.productReviewDate !== undefined) {
      data.productReviewDate = new Date(dto.productReviewDate);
    }
    if (dto.poReceivedDate !== undefined) {
      data.poReceivedDate = new Date(dto.poReceivedDate);
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data,
      include: { customer: true, items: { include: { product: true } } },
    });
  }
}
