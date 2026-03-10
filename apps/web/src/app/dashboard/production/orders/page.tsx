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
import { Plus, Play, CheckCircle, Eye } from 'lucide-react';

export default function ProductionOrdersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    plannedStartDate: '',
    plannedEndDate: '',
    notes: '',
  });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['productionOrders'],
    queryFn: () => api.getProductionOrders(),
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
  const products = Array.isArray(productsData?.data)
    ? productsData.data
    : productsData?.data?.data ?? [];
  const warehouses = Array.isArray(warehousesData?.data)
    ? warehousesData.data
    : warehousesData?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createProductionOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionOrders'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const startMutation = useMutation({
    mutationFn: ({ id, warehouseId }: { id: string; warehouseId: string }) =>
      api.startProduction(id, warehouseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionOrders'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, warehouseId }: { id: string; warehouseId: string }) =>
      api.completeProduction(id, warehouseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionOrders'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });

  const resetForm = () => {
    setFormData({
      productId: '',
      quantity: '',
      plannedStartDate: '',
      plannedEndDate: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      quantity: parseInt(formData.quantity),
    });
  };

  const handleStart = (order: any) => {
    const warehouseId = prompt('Enter warehouse ID to deduct materials from:');
    if (warehouseId && warehouses.find((w: any) => w.id === warehouseId)) {
      startMutation.mutate({ id: order.id, warehouseId });
    } else if (warehouseId) {
      alert('Invalid warehouse ID');
    }
  };

  const handleComplete = (order: any) => {
    const warehouseId = prompt('Enter warehouse ID to add finished product:');
    if (warehouseId && warehouses.find((w: any) => w.id === warehouseId)) {
      completeMutation.mutate({ id: order.id, warehouseId });
    } else if (warehouseId) {
      alert('Invalid warehouse ID');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
      PLANNED: 'info',
      IN_PROGRESS: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Orders</h1>
          <p className="text-gray-500">Manage manufacturing orders</p>
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
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Planned Start</TableHead>
                  <TableHead>Planned End</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                    <TableCell className="font-medium">{order.product?.name}</TableCell>
                    <TableCell className="text-right">{order.quantity}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {order.plannedStartDate ? formatDate(order.plannedStartDate) : '-'}
                    </TableCell>
                    <TableCell>
                      {order.plannedEndDate ? formatDate(order.plannedEndDate) : '-'}
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
                        {order.status === 'PLANNED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStart(order)}
                            title="Start Production"
                          >
                            <Play className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        {order.status === 'IN_PROGRESS' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleComplete(order)}
                            title="Complete Production"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No production orders found
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
        title="New Production Order"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Product"
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            options={[
              { value: '', label: 'Select Product' },
              ...products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name}` })),
            ]}
            required
          />
          <Input
            label="Quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
            min={1}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Planned Start Date"
              type="date"
              value={formData.plannedStartDate}
              onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
            />
            <Input
              label="Planned End Date"
              type="date"
              value={formData.plannedEndDate}
              onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
            />
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
            <Button type="submit" isLoading={createMutation.isPending}>
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
                <p className="text-sm text-gray-500">Product</p>
                <p className="font-medium">{selectedOrder.product?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium">{selectedOrder.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium">{formatDateTime(selectedOrder.createdAt)}</p>
              </div>
            </div>
            {selectedOrder.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-gray-700">{selectedOrder.notes}</p>
              </div>
            )}
            <div className="pt-2 text-xs text-gray-400">
              <p>Warehouse IDs for actions:</p>
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
