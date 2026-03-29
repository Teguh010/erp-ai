import { Controller, Get, Post, Body, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSalesOrderDto, UpdateSalesOrderStatusDto, CreateCustomerDto } from './dto/sales.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Controller('sales')
@UseGuards(AuthGuard('jwt'))
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('customers')
  createCustomer(@Body() createDto: CreateCustomerDto) {
    return this.salesService.createCustomer(createDto);
  }

  @Get('customers')
  getAllCustomers() {
    return this.salesService.getAllCustomers();
  }

  @Post('orders')
  createSalesOrder(@Body() createDto: CreateSalesOrderDto) {
    return this.salesService.createSalesOrder(createDto);
  }

  @Get('orders')
  getSalesOrders() {
    return this.salesService.getSalesOrders();
  }

  @Get('orders/:id')
  getSalesOrderById(@Param('id') id: string) {
    return this.salesService.getSalesOrderById(id);
  }

  @Patch('orders/:id/status')
  updateSalesOrderStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateSalesOrderStatusDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).sub;
    return this.salesService.updateSalesOrderStatus(id, updateDto, userId);
  }
}
