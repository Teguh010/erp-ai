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
  price: number;
}

export default function SalesOrdersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    expectedDeliveryDate: '',
    items: [] as OrderItem[],
  });
  const [newItem, setNewItem] = useState({ productId: '', quantity: '', price: '' });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: () => api.getSalesOrders(),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.getCustomers(),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
  });

  const orders = Array.isArray(ordersData?.data) ? ordersData.data : ordersData?.data?.data ?? [];
  const customers = Array.isArray(customersData?.data) ? customersData.data : customersData?.data?.data ?? [];
  const products = Array.isArray(productsData?.data) ? productsData.data : productsData?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createSalesOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateSalesOrderStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      setIsDetailModalOpen(false);
    },
  });

  const resetForm = () => {
    setFormData({
      customerId: '',
      expectedDeliveryDate: '',
      items: [],
    });
    setNewItem({ productId: '', quantity: '', price: '' });
  };

  const addItem = () => {
    if (newItem.productId && newItem.quantity && newItem.price) {
      setFormData({
        ...formData,
        items: [
          ...formData.items,
          {
            productId: newItem.productId,
            quantity: parseInt(newItem.quantity),
            price: parseFloat(newItem.price),
          },
        ],
      });
      setNewItem({ productId: '', quantity: '', price: '' });
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
    if (formData.customerId && formData.items.length > 0) {
      const payload = {
        ...formData,
        expectedDeliveryDate: formData.expectedDeliveryDate ? new Date(formData.expectedDeliveryDate).toISOString() : undefined,
      };
      createMutation.mutate(payload);
    }
  };

  const handleStatusChange = (order: any, newStatus: string) => {
    if (confirm(`Are you sure you want to change the status to ${newStatus}?`)) {
      updateStatusMutation.mutate({ id: order.id, status: newStatus });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
      PENDING: 'default',
      PROCESSING: 'warning',
      SHIPPED: 'info',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getNextStatus = (status: string): string | null => {
    const flow: Record<string, string> = {
      PENDING: 'PROCESSING',
      PROCESSING: 'SHIPPED',
      SHIPPED: 'COMPLETED',
    };
    return flow[status] || null;
  };

  const getFormatCurrency = (amount: number) => {
     return new Intl.NumberFormat('id-ID', {
       style: 'currency',
       currency: 'IDR'
     }).format(amount);
  };

  const getFormatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const totalAmount = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-gray-500">Manage client orders and shipments</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Sales Order
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                    <TableCell className="font-medium">{order.customer?.name}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      {getFormatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {order.expectedDeliveryDate ? getFormatDate(order.expectedDeliveryDate) : '-'}
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
                            Mark {getNextStatus(order.status)}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No sales orders found
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
        title="New Sales Order"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Customer"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              options={[
                { value: '', label: 'Select Customer' },
                ...customers.map((c: any) => ({ value: c.id, label: c.name })),
              ]}
              required
            />
            <Input
              label="Expected Delivery"
              type="date"
              value={formData.expectedDeliveryDate}
              onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
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
                          {item.quantity} x {getFormatCurrency(item.price)}
                        </span>
                        <span className="font-medium">
                          {getFormatCurrency(item.quantity * item.price)}
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
                  Total: {getFormatCurrency(totalAmount)}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Select
                value={newItem.productId}
                onChange={(e) => {
                  const selectedProduct = products.find((p: any) => p.id === e.target.value);
                  setNewItem({ 
                    ...newItem, 
                    productId: e.target.value,
                    price: selectedProduct ? String(selectedProduct.salePrice || 0) : ''
                  });
                }}
                options={[
                  { value: '', label: 'Select Product' },
                  ...products.map((p: any) => ({ value: p.id, label: `${p.sku || p.id} - ${p.name}` })),
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
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                className="w-32"
                min={0}
              />
              <Button type="button" variant="outline" onClick={addItem}>
                Add
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.customerId || formData.items.length === 0}
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
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{selectedOrder.customer?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-medium">{getFormatCurrency(selectedOrder.totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expected Delivery</p>
                <p className="font-medium">
                  {selectedOrder.expectedDeliveryDate
                    ? getFormatDate(selectedOrder.expectedDeliveryDate)
                    : '-'}
                </p>
              </div>
               <div>
                <p className="text-sm text-gray-500">Shipping Date</p>
                <p className="font-medium">
                  {selectedOrder.shippingDate
                    ? getFormatDate(selectedOrder.shippingDate)
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
                          {getFormatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {getFormatCurrency(item.quantity * item.price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
             
            <div className="flex justify-end pt-4 gap-2">
               {getNextStatus(selectedOrder.status) && (
                 <Button
                   onClick={() => handleStatusChange(selectedOrder, getNextStatus(selectedOrder.status)!)}
                 >
                   Update Status to {getNextStatus(selectedOrder.status)}
                 </Button>
               )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
