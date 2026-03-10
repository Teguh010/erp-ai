// ==================== AUTH ====================
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setAuth: (token: string, user: User) => void;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  roleName?: string;
}

// ==================== INVENTORY ====================
export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: Category;
  unitPrice: number;
  reorderLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stocks?: Stock[];
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  stocks?: Stock[];
}

export interface Stock {
  id: string;
  productId: string;
  product?: Product;
  warehouseId: string;
  warehouse?: Warehouse;
  quantity: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  product?: Product;
  warehouseId: string;
  warehouse?: Warehouse;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  reference?: string;
  notes?: string;
  createdById: string;
  createdBy?: User;
  createdAt: string;
}

export interface CreateProductDto {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  unitPrice: number;
  reorderLevel?: number;
}

export interface CreateWarehouseDto {
  code: string;
  name: string;
  location?: string;
}

export interface CreateStockMovementDto {
  productId: string;
  warehouseId: string;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reference?: string;
  notes?: string;
}

// ==================== PRODUCTION ====================
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface BillOfMaterials {
  id: string;
  productId: string;
  product?: Product;
  materialId: string;
  material?: Product;
  quantity: number;
  createdAt: string;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  productId: string;
  product?: Product;
  quantity: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: Supplier;
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';
  totalAmount: number;
  expectedDelivery?: string;
  notes?: string;
  items?: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
}

export interface CreateSupplierDto {
  code: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface CreateProductionOrderDto {
  productId: string;
  quantity: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  notes?: string;
}

export interface CreatePurchaseOrderDto {
  supplierId: string;
  expectedDelivery?: string;
  notes?: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
}

// ==================== DASHBOARD ====================
export interface DashboardStats {
  totalProducts: number;
  totalWarehouses: number;
  totalStock: number;
  lowStockCount: number;
  recentMovements: StockMovement[];
}

// ==================== API ====================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
