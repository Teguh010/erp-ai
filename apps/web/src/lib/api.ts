import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: { email: string; password: string; fullName: string; roleName?: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  // Inventory - Dashboard
  async getDashboardStats() {
    const response = await this.client.get('/inventory/dashboard');
    return response.data;
  }

  // Inventory - Warehouses
  async getWarehouses() {
    const response = await this.client.get('/inventory/warehouses');
    return response.data;
  }

  async getWarehouse(id: string) {
    const response = await this.client.get(`/inventory/warehouses/${id}`);
    return response.data;
  }

  async createWarehouse(data: { code: string; name: string; location?: string }) {
    const response = await this.client.post('/inventory/warehouses', data);
    return response.data;
  }

  async updateWarehouse(id: string, data: { name?: string; location?: string; isActive?: boolean }) {
    const response = await this.client.put(`/inventory/warehouses/${id}`, data);
    return response.data;
  }

  async deleteWarehouse(id: string) {
    const response = await this.client.delete(`/inventory/warehouses/${id}`);
    return response.data;
  }

  // Inventory - Categories
  async getCategories() {
    const response = await this.client.get('/inventory/categories');
    return response.data;
  }

  async createCategory(data: { name: string; description?: string }) {
    const response = await this.client.post('/inventory/categories', data);
    return response.data;
  }

  // Inventory - Products
  async getProducts(params?: { categoryId?: string; search?: string }) {
    const response = await this.client.get('/inventory/products', { params });
    return response.data;
  }

  async getProduct(id: string) {
    const response = await this.client.get(`/inventory/products/${id}`);
    return response.data;
  }

  async createProduct(data: {
    sku: string;
    name: string;
    description?: string;
    categoryId: string;
    unitPrice: number;
    reorderLevel?: number;
  }) {
    const response = await this.client.post('/inventory/products', data);
    return response.data;
  }

  async updateProduct(id: string, data: Partial<{
    name: string;
    description: string;
    categoryId: string;
    unitPrice: number;
    reorderLevel: number;
    isActive: boolean;
  }>) {
    const response = await this.client.put(`/inventory/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string) {
    const response = await this.client.delete(`/inventory/products/${id}`);
    return response.data;
  }

  // Inventory - Stock
  async getStock(params?: { productId?: string; warehouseId?: string }) {
    const response = await this.client.get('/inventory/stock', { params });
    return response.data;
  }

  async getLowStock(warehouseId?: string) {
    const response = await this.client.get('/inventory/stock/low', { params: { warehouseId } });
    return response.data;
  }

  // Inventory - Stock Movements
  async getStockMovements(params?: { productId?: string; warehouseId?: string }) {
    const response = await this.client.get('/inventory/movements', { params });
    return response.data;
  }

  async createStockMovement(data: {
    productId: string;
    warehouseId: string;
    movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: number;
    reference?: string;
    notes?: string;
  }) {
    const response = await this.client.post('/inventory/movements', data);
    return response.data;
  }

  // Production - BOM
  async getBOMs() {
    const response = await this.client.get('/production/bom');
    return response.data;
  }

  async getBOM(id: string) {
    const response = await this.client.get(`/production/bom/${id}`);
    return response.data;
  }

  async createBOM(data: { productId: string; materials: { materialId: string; quantity: number }[] }) {
    const response = await this.client.post('/production/bom', data);
    return response.data;
  }

  async deleteBOM(id: string) {
    const response = await this.client.delete(`/production/bom/${id}`);
    return response.data;
  }

  // Production - Orders
  async getProductionOrders() {
    const response = await this.client.get('/production/orders');
    return response.data;
  }

  async getProductionOrder(id: string) {
    const response = await this.client.get(`/production/orders/${id}`);
    return response.data;
  }

  async createProductionOrder(data: {
    productId: string;
    quantity: number;
    plannedStartDate?: string;
    plannedEndDate?: string;
    notes?: string;
  }) {
    const response = await this.client.post('/production/orders', data);
    return response.data;
  }

  async updateProductionOrder(id: string, data: Partial<{
    quantity: number;
    status: string;
    plannedStartDate: string;
    plannedEndDate: string;
    notes: string;
  }>) {
    const response = await this.client.put(`/production/orders/${id}`, data);
    return response.data;
  }

  async startProduction(id: string, warehouseId: string) {
    const response = await this.client.post(`/production/orders/${id}/start`, { warehouseId });
    return response.data;
  }

  async completeProduction(id: string, warehouseId: string) {
    const response = await this.client.post(`/production/orders/${id}/complete`, { warehouseId });
    return response.data;
  }

  // Production - Suppliers
  async getSuppliers() {
    const response = await this.client.get('/production/suppliers');
    return response.data;
  }

  async getSupplier(id: string) {
    const response = await this.client.get(`/production/suppliers/${id}`);
    return response.data;
  }

  async createSupplier(data: {
    code: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    const response = await this.client.post('/production/suppliers', data);
    return response.data;
  }

  async updateSupplier(id: string, data: Partial<{
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    isActive: boolean;
  }>) {
    const response = await this.client.put(`/production/suppliers/${id}`, data);
    return response.data;
  }

  async deleteSupplier(id: string) {
    const response = await this.client.delete(`/production/suppliers/${id}`);
    return response.data;
  }

  // Production - Purchase Orders
  async getPurchaseOrders() {
    const response = await this.client.get('/production/purchase-orders');
    return response.data;
  }

  async getPurchaseOrder(id: string) {
    const response = await this.client.get(`/production/purchase-orders/${id}`);
    return response.data;
  }

  async createPurchaseOrder(data: {
    supplierId: string;
    expectedDelivery?: string;
    notes?: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
  }) {
    const response = await this.client.post('/production/purchase-orders', data);
    return response.data;
  }

  async updatePurchaseOrderStatus(id: string, status: string, warehouseId?: string) {
    const response = await this.client.put(
      `/production/purchase-orders/${id}/status`,
      { status },
      { params: { warehouseId } }
    );
    return response.data;
  }

  // AI Agent
  async aiChat(question: string, context?: string) {
    const response = await this.client.post('/ai/chat', { question, context });
    return response.data;
  }

  async aiAnalyzeInventory(query: string) {
    const response = await this.client.post('/ai/analyze/inventory', { query });
    return response.data;
  }

  async aiAnalyzeProduction(query: string) {
    const response = await this.client.post('/ai/analyze/production', { query });
    return response.data;
  }

  async aiTextToSQL(naturalLanguageQuery: string) {
    const response = await this.client.post('/ai/query', { naturalLanguageQuery });
    return response.data;
  }
}

export const api = new ApiClient();
