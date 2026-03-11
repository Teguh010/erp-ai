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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  CreatePackagingReportDto,
  UpdatePackagingReportDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Production')
@ApiBearerAuth('JWT-auth')
@Controller('production')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  // ==================== BOM ====================
  @Post('bom')
  @ApiOperation({ summary: 'Create a Bill of Materials' })
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  createBOM(@Body() dto: CreateBOMDto) {
    return this.productionService.createBOM(dto);
  }

  @Get('bom')
  @ApiOperation({ summary: 'Get all BOMs' })
  getAllBOMs() {
    return this.productionService.getAllBOMs();
  }

  @Get('bom/:id')
  @ApiOperation({ summary: 'Get BOM by ID' })
  getBOMById(@Param('id') id: string) {
    return this.productionService.getBOMById(id);
  }

  @Put('bom/:id')
  @ApiOperation({ summary: 'Update BOM' })
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  updateBOM(@Param('id') id: string, @Body() dto: UpdateBOMDto) {
    return this.productionService.updateBOM(id, dto);
  }

  @Delete('bom/:id')
  @ApiOperation({ summary: 'Delete BOM' })
  @Roles('ADMIN')
  deleteBOM(@Param('id') id: string) {
    return this.productionService.deleteBOM(id);
  }

  // ==================== PRODUCTION ORDER ====================
  @Post('orders')
  @ApiOperation({ summary: 'Create a production order' })
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  createProductionOrder(@Body() dto: CreateProductionOrderDto) {
    return this.productionService.createProductionOrder(dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all production orders' })
  getAllProductionOrders() {
    return this.productionService.getAllProductionOrders();
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get production order by ID' })
  getProductionOrderById(@Param('id') id: string) {
    return this.productionService.getProductionOrderById(id);
  }

  @Put('orders/:id')
  @ApiOperation({ summary: 'Update production order' })
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  updateProductionOrder(
    @Param('id') id: string,
    @Body() dto: UpdateProductionOrderDto,
  ) {
    return this.productionService.updateProductionOrder(id, dto);
  }

  @Post('orders/:id/start')
  @ApiOperation({ summary: 'Start production (deduct raw materials)' })
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
  @ApiOperation({ summary: 'Complete production (add finished product)' })
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
  @ApiOperation({ summary: 'Create a supplier' })
  @Roles('ADMIN', 'PROCUREMENT')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.productionService.createSupplier(dto);
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'Get all suppliers' })
  getAllSuppliers() {
    return this.productionService.getAllSuppliers();
  }

  @Get('suppliers/:id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  getSupplierById(@Param('id') id: string) {
    return this.productionService.getSupplierById(id);
  }

  @Put('suppliers/:id')
  @ApiOperation({ summary: 'Update supplier' })
  @Roles('ADMIN', 'PROCUREMENT')
  updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.productionService.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  @ApiOperation({ summary: 'Delete supplier' })
  @Roles('ADMIN')
  deleteSupplier(@Param('id') id: string) {
    return this.productionService.deleteSupplier(id);
  }

  // ==================== PURCHASE ORDER ====================
  @Post('purchase-orders')
  @ApiOperation({ summary: 'Create a purchase order' })
  @Roles('ADMIN', 'PROCUREMENT')
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto) {
    return this.productionService.createPurchaseOrder(dto);
  }

  @Get('purchase-orders')
  @ApiOperation({ summary: 'Get all purchase orders' })
  getAllPurchaseOrders() {
    return this.productionService.getAllPurchaseOrders();
  }

  @Get('purchase-orders/:id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  getPurchaseOrderById(@Param('id') id: string) {
    return this.productionService.getPurchaseOrderById(id);
  }

  @Put('purchase-orders/:id/status')
  @ApiOperation({ summary: 'Update purchase order status' })
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

  // ==================== LAPORAN PACKAGING ====================
  @Post('packaging-reports')
  @ApiOperation({ summary: 'Create packaging report' })
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  createPackagingReport(@Body() dto: CreatePackagingReportDto) {
    return this.productionService.createPackagingReport(dto);
  }

  @Get('packaging-reports')
  @ApiOperation({ summary: 'Get all packaging reports' })
  getAllPackagingReports(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.productionService.getAllPackagingReports({ from, to });
  }

  @Get('packaging-reports/:id')
  @ApiOperation({ summary: 'Get packaging report by ID' })
  getPackagingReportById(@Param('id') id: string) {
    return this.productionService.getPackagingReportById(id);
  }

  @Put('packaging-reports/:id')
  @ApiOperation({ summary: 'Update packaging report' })
  @Roles('ADMIN', 'PRODUCTION_MANAGER')
  updatePackagingReport(
    @Param('id') id: string,
    @Body() dto: UpdatePackagingReportDto,
  ) {
    return this.productionService.updatePackagingReport(id, dto);
  }

  @Delete('packaging-reports/:id')
  @ApiOperation({ summary: 'Delete packaging report' })
  @Roles('ADMIN')
  deletePackagingReport(@Param('id') id: string) {
    return this.productionService.deletePackagingReport(id);
  }
}
