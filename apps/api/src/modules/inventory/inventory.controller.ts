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
import { InventoryService } from './inventory.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  CreateUnitDto,
  CreateStockMovementDto,
  StockQueryDto,
  LowStockQueryDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedRequest } from '../../common/interfaces';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ==================== DASHBOARD ====================
  @Get('dashboard')
  @ApiOperation({ summary: 'Get inventory dashboard statistics' })
  getDashboardStats() {
    return this.inventoryService.getDashboardStats();
  }

  // ==================== WAREHOUSE ====================
  @Post('warehouses')
  @ApiOperation({ summary: 'Create a new warehouse' })
  @Roles('ADMIN', 'WAREHOUSE_MANAGER')
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(dto);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'Get all warehouses' })
  getAllWarehouses() {
    return this.inventoryService.getAllWarehouses();
  }

  @Get('warehouses/:id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  getWarehouseById(@Param('id') id: string) {
    return this.inventoryService.getWarehouseById(id);
  }

  @Put('warehouses/:id')
  @ApiOperation({ summary: 'Update warehouse' })
  @Roles('ADMIN', 'WAREHOUSE_MANAGER')
  updateWarehouse(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.inventoryService.updateWarehouse(id, dto);
  }

  @Delete('warehouses/:id')
  @ApiOperation({ summary: 'Delete warehouse' })
  @Roles('ADMIN')
  deleteWarehouse(@Param('id') id: string) {
    return this.inventoryService.deleteWarehouse(id);
  }

  // ==================== CATEGORY ====================
  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  @Roles('ADMIN')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.inventoryService.createCategory(dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  getAllCategories() {
    return this.inventoryService.getAllCategories();
  }

  // ==================== UNIT ====================
  @Post('units')
  @ApiOperation({ summary: 'Create a new unit' })
  @Roles('ADMIN')
  createUnit(@Body() dto: CreateUnitDto) {
    return this.inventoryService.createUnit(dto);
  }

  @Get('units')
  @ApiOperation({ summary: 'Get all units' })
  getAllUnits() {
    return this.inventoryService.getAllUnits();
  }

  // ==================== PRODUCT ====================
  @Post('products')
  @ApiOperation({ summary: 'Create a new product' })
  @Roles('ADMIN', 'WAREHOUSE_MANAGER')
  createProduct(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products with optional filters' })
  getAllProducts(@Query() query: StockQueryDto) {
    return this.inventoryService.getAllProducts(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product by ID' })
  getProductById(@Param('id') id: string) {
    return this.inventoryService.getProductById(id);
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Update product' })
  @Roles('ADMIN', 'WAREHOUSE_MANAGER')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.inventoryService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product' })
  @Roles('ADMIN')
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  // ==================== STOCK ====================
  @Get('stock')
  @ApiOperation({ summary: 'Get stock levels' })
  getStock(@Query() query: StockQueryDto) {
    return this.inventoryService.getStock(query);
  }

  @Get('stock/low')
  @ApiOperation({ summary: 'Get low stock items' })
  getLowStockItems(@Query() query: LowStockQueryDto) {
    return this.inventoryService.getLowStockItems(query.warehouseId);
  }

  // ==================== STOCK MOVEMENT ====================
  @Post('movements')
  @ApiOperation({ summary: 'Create stock movement' })
  @Roles('ADMIN', 'WAREHOUSE_MANAGER')
  createStockMovement(
    @Body() dto: CreateStockMovementDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.inventoryService.createStockMovement(dto, req.user.sub);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movements' })
  getStockMovements(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getStockMovements(productId, warehouseId);
  }
}
