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
import { InventoryService } from './inventory.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  CreateStockMovementDto,
  StockQueryDto,
  LowStockQueryDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ==================== DASHBOARD ====================
  @Get('dashboard')
  getDashboardStats() {
    return this.inventoryService.getDashboardStats();
  }

  // ==================== WAREHOUSE ====================
  @Post('warehouses')
  @Roles('ADMIN', 'WAREHOUSE_MANAGER')
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(dto);
  }

  @Get('warehouses')
  getAllWarehouses() {
    return this.inventoryService.getAllWarehouses();
  }

  @Get('warehouses/:id')
  getWarehouseById(@Param('id') id: string) {
    return this.inventoryService.getWarehouseById(id);
  }

  @Put('warehouses/:id')
  @Roles('ADMIN', 'WAREHOUSE_MANAGER')
  updateWarehouse(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.inventoryService.updateWarehouse(id, dto);
  }

  @Delete('warehouses/:id')
  @Roles('ADMIN')
  deleteWarehouse(@Param('id') id: string) {
    return this.inventoryService.deleteWarehouse(id);
  }

  // ==================== CATEGORY ====================
  @Post('categories')
  @Roles('ADMIN')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.inventoryService.createCategory(dto);
  }

  @Get('categories')
  getAllCategories() {
    return this.inventoryService.getAllCategories();
  }

  // ==================== PRODUCT ====================
  @Post('products')
  @Roles('ADMIN', 'WAREHOUSE_MANAGER')
  createProduct(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Get('products')
  getAllProducts(@Query() query: StockQueryDto) {
    return this.inventoryService.getAllProducts(query);
  }

  @Get('products/:id')
  getProductById(@Param('id') id: string) {
    return this.inventoryService.getProductById(id);
  }

  @Put('products/:id')
  @Roles('ADMIN', 'WAREHOUSE_MANAGER')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.inventoryService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @Roles('ADMIN')
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  // ==================== STOCK ====================
  @Get('stock')
  getStock(@Query() query: StockQueryDto) {
    return this.inventoryService.getStock(query);
  }

  @Get('stock/low')
  getLowStockItems(@Query() query: LowStockQueryDto) {
    return this.inventoryService.getLowStockItems(query.warehouseId);
  }

  // ==================== STOCK MOVEMENT ====================
  @Post('movements')
  @Roles('ADMIN', 'WAREHOUSE_MANAGER')
  createStockMovement(
    @Body() dto: CreateStockMovementDto,
    @Request() req: any,
  ) {
    return this.inventoryService.createStockMovement(dto, req.user.sub);
  }

  @Get('movements')
  getStockMovements(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getStockMovements(productId, warehouseId);
  }
}
