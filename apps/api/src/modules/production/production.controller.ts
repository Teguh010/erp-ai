import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductionService } from './production.service';
import {
  CreateBOMDto,
  UpdateBOMDto,
  CreateProductionOrderDto,
  UpdateProductionOrderDto,
  CreateSupplierDto,
  UpdateSupplierDto,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderStatusDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('production')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  // ==================== BOM ====================
  @Post('bom')
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  createBOM(@Body() dto: CreateBOMDto) {
    return this.productionService.createBOM(dto);
  }

  @Get('bom')
  getAllBOMs() {
    return this.productionService.getAllBOMs();
  }

  @Get('bom/:id')
  getBOMById(@Param('id') id: string) {
    return this.productionService.getBOMById(id);
  }

  @Put('bom/:id')
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  updateBOM(@Param('id') id: string, @Body() dto: UpdateBOMDto) {
    return this.productionService.updateBOM(id, dto);
  }

  @Delete('bom/:id')
  @Roles('ADMIN')
  deleteBOM(@Param('id') id: string) {
    return this.productionService.deleteBOM(id);
  }

  // ==================== PRODUCTION ORDER ====================
  @Post('orders')
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  createProductionOrder(@Body() dto: CreateProductionOrderDto) {
    return this.productionService.createProductionOrder(dto);
  }

  @Get('orders')
  getAllProductionOrders() {
    return this.productionService.getAllProductionOrders();
  }

  @Get('orders/:id')
  getProductionOrderById(@Param('id') id: string) {
    return this.productionService.getProductionOrderById(id);
  }

  @Put('orders/:id')
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  updateProductionOrder(
    @Param('id') id: string,
    @Body() dto: UpdateProductionOrderDto,
  ) {
    return this.productionService.updateProductionOrder(id, dto);
  }

  @Post('orders/:id/start')
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  startProduction(
    @Param('id') id: string,
    @Body('warehouseId') warehouseId: string,
    @Request() req: any,
  ) {
    return this.productionService.startProduction(
      id,
      warehouseId,
      req.user.sub,
    );
  }

  @Post('orders/:id/complete')
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  completeProduction(
    @Param('id') id: string,
    @Body('warehouseId') warehouseId: string,
    @Request() req: any,
  ) {
    return this.productionService.completeProduction(
      id,
      warehouseId,
      req.user.sub,
    );
  }

  // ==================== SUPPLIER ====================
  @Post('suppliers')
  @Roles('ADMIN', 'PROCUREMENT')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.productionService.createSupplier(dto);
  }

  @Get('suppliers')
  getAllSuppliers() {
    return this.productionService.getAllSuppliers();
  }

  @Get('suppliers/:id')
  getSupplierById(@Param('id') id: string) {
    return this.productionService.getSupplierById(id);
  }

  @Put('suppliers/:id')
  @Roles('ADMIN', 'PROCUREMENT')
  updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.productionService.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  @Roles('ADMIN')
  deleteSupplier(@Param('id') id: string) {
    return this.productionService.deleteSupplier(id);
  }

  // ==================== PURCHASE ORDER ====================
  @Post('purchase-orders')
  @Roles('ADMIN', 'PROCUREMENT')
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto) {
    return this.productionService.createPurchaseOrder(dto);
  }

  @Get('purchase-orders')
  getAllPurchaseOrders() {
    return this.productionService.getAllPurchaseOrders();
  }

  @Get('purchase-orders/:id')
  getPurchaseOrderById(@Param('id') id: string) {
    return this.productionService.getPurchaseOrderById(id);
  }

  @Put('purchase-orders/:id/status')
  @Roles('ADMIN', 'PROCUREMENT', 'WAREHOUSE_MANAGER')
  updatePurchaseOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderStatusDto,
    @Query('warehouseId') warehouseId: string | undefined,
    @Request() req: any,
  ) {
    return this.productionService.updatePurchaseOrderStatus(
      id,
      dto,
      warehouseId,
      req?.user?.sub,
    );
  }
}
