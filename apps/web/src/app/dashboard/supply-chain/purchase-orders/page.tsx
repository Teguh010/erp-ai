'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime, getStatusColor } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Select,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from '@/components/ui';
import { Plus, Eye, Trash2 } from 'lucide-react';

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDelivery: '',
    notes: '',
    items: [] as OrderItem[],
  });
  const [newItem, setNewItem] = useState({ productId: '', quantity: '', unitPrice: '' });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => api.getPurchaseOrders(),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.getSuppliers(),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.getWarehouses(),
  });

  // Handle both plain array and paginated { data: { data: [], meta } } API shapes
  const orders = Array.isArray(ordersData?.data)
    ? ordersData.data
    : ordersData?.data?.data ?? [];
  const suppliers = Array.isArray(suppliersData?.data)
    ? suppliersData.data
    : suppliersData?.data?.data ?? [];
  const products = Array.isArray(productsData?.data)
    ? productsData.data
    : productsData?.data?.data ?? [];
  const warehouses = Array.isArray(warehousesData?.data)
    ? warehousesData.data
    : warehousesData?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, warehouseId }: { id: string; status: string; warehouseId?: string }) =>
      api.updatePurchaseOrderStatus(id, status, warehouseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });

  const resetForm = () => {
    setFormData({
      supplierId: '',
      expectedDelivery: '',
      notes: '',
      items: [],
    });
    setNewItem({ productId: '', quantity: '', unitPrice: '' });
  };

  const addItem = () => {
    if (newItem.productId && newItem.quantity && newItem.unitPrice) {
      setFormData({
        ...formData,
        items: [
          ...formData.items,
          {
            productId: newItem.productId,
            quantity: parseInt(newItem.quantity),
            unitPrice: parseFloat(newItem.unitPrice),
          },
        ],
      });
      setNewItem({ productId: '', quantity: '', unitPrice: '' });
    }
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.supplierId && formData.items.length > 0) {
      createMutation.mutate(formData);
    }
  };

  const handleStatusChange = (order: any, newStatus: string) => {
    if (newStatus === 'RECEIVED') {
      const warehouseId = prompt('Enter warehouse ID to receive items:');
      if (warehouseId && warehouses.find((w: any) => w.id === warehouseId)) {
        updateStatusMutation.mutate({ id: order.id, status: newStatus, warehouseId });
      } else if (warehouseId) {
        alert('Invalid warehouse ID');
      }
    } else {
      updateStatusMutation.mutate({ id: order.id, status: newStatus });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
      DRAFT: 'default',
      SENT: 'info',
      CONFIRMED: 'warning',
      RECEIVED: 'success',
      CANCELLED: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getNextStatus = (status: string): string | null => {
    const flow: Record<string, string> = {
      DRAFT: 'SENT',
      SENT: 'CONFIRMED',
      CONFIRMED: 'RECEIVED',
    };
    return flow[status] || null;
  };

  const totalAmount = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500">Manage supplier orders</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Order
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                    <TableCell className="font-medium">{order.supplier?.name}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {order.expectedDelivery ? formatDate(order.expectedDelivery) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {getNextStatus(order.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(order, getNextStatus(order.status)!)
                            }
                          >
                            {getNextStatus(order.status)}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Order Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Purchase Order"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Supplier"
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              options={[
                { value: '', label: 'Select Supplier' },
                ...suppliers.map((s: any) => ({ value: s.id, label: s.name })),
              ]}
              required
            />
            <Input
              label="Expected Delivery"
              type="date"
              value={formData.expectedDelivery}
              onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
            />
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Order Items</h4>

            {formData.items.length > 0 && (
              <div className="mb-4 space-y-2">
                {formData.items.map((item, index) => {
                  const product = products.find((p: any) => p.id === item.productId);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span>{product?.name || item.productId}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <div className="text-right font-semibold pt-2 border-t">
                  Total: {formatCurrency(totalAmount)}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Select
                value={newItem.productId}
                onChange={(e) => setNewItem({ ...newItem, productId: e.target.value })}
                options={[
                  { value: '', label: 'Select Product' },
                  ...products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name}` })),
                ]}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Qty"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                className="w-20"
                min={1}
              />
              <Input
                type="number"
                placeholder="Price"
                value={newItem.unitPrice}
                onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                className="w-28"
                min={0}
              />
              <Button type="button" variant="outline" onClick={addItem}>
                Add
              </Button>
            </div>
          </div>

          <Input
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending}
              disabled={!formData.supplierId || formData.items.length === 0}
            >
              Create Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Order Details - ${selectedOrder?.orderNumber}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="font-medium">{selectedOrder.supplier?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-medium">{formatCurrency(selectedOrder.totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expected Delivery</p>
                <p className="font-medium">
                  {selectedOrder.expectedDelivery
                    ? formatDate(selectedOrder.expectedDelivery)
                    : '-'}
                </p>
              </div>
            </div>

            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Items</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product?.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="pt-2 text-xs text-gray-400">
              <p>Warehouse IDs for receiving:</p>
              <ul className="mt-1 space-y-1">
                {warehouses.map((w: any) => (
                  <li key={w.id}>
                    {w.name}: <code className="bg-gray-100 px-1 rounded">{w.id}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
