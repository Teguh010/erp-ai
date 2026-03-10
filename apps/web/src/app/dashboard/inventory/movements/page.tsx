'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
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
import { Plus, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export default function MovementsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({ productId: '', warehouseId: '' });
  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: '',
    movementType: 'IN',
    quantity: '',
    reference: '',
    notes: '',
  });

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ['movements', filters],
    queryFn: () =>
      api.getStockMovements({
        productId: filters.productId || undefined,
        warehouseId: filters.warehouseId || undefined,
      }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.getWarehouses(),
  });

  // API responses are wrapped; paginated lists come as { data: { data: [], meta } }
  const movements = Array.isArray(movementsData?.data)
    ? movementsData.data
    : movementsData?.data?.data ?? [];
  const products = Array.isArray(productsData?.data)
    ? productsData.data
    : productsData?.data?.data ?? [];
  const warehouses = warehousesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createStockMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsModalOpen(false);
      setFormData({
        productId: '',
        warehouseId: '',
        movementType: 'IN',
        quantity: '',
        reference: '',
        notes: '',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      quantity: parseInt(formData.quantity),
    });
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowDownRight className="w-4 h-4 text-green-600" />;
      case 'OUT':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      default:
        return <RefreshCw className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getMovementBadge = (type: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
      IN: 'success',
      OUT: 'danger',
      ADJUSTMENT: 'warning',
      TRANSFER: 'info',
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Movements</h1>
          <p className="text-gray-500">Track inventory in/out transactions</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Movement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Select
              value={filters.warehouseId}
              onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
              options={[
                { value: '', label: 'All Warehouses' },
                ...warehouses.map((w: any) => ({ value: w.id, label: w.name })),
              ]}
              className="w-48"
            />
            <Select
              value={filters.productId}
              onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
              options={[
                { value: '', label: 'All Products' },
                ...products.map((p: any) => ({ value: p.id, label: p.name })),
              ]}
              className="w-48"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement: any) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm">
                      {formatDateTime(movement.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.movementType)}
                        {getMovementBadge(movement.movementType)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{movement.product?.name}</TableCell>
                    <TableCell>{movement.warehouse?.name}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        movement.movementType === 'IN' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {movement.movementType === 'IN' ? '+' : '-'}
                      {movement.quantity}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {movement.reference || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                      {movement.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No movements found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Movement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Stock Movement"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            <Select
              label="Warehouse"
              value={formData.warehouseId}
              onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
              options={[
                { value: '', label: 'Select Warehouse' },
                ...warehouses.map((w: any) => ({ value: w.id, label: w.name })),
              ]}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Movement Type"
              value={formData.movementType}
              onChange={(e) => setFormData({ ...formData, movementType: e.target.value })}
              options={[
                { value: 'IN', label: 'Stock In' },
                { value: 'OUT', label: 'Stock Out' },
                { value: 'ADJUSTMENT', label: 'Adjustment' },
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
          </div>
          <Input
            label="Reference"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            placeholder="PO-001, SO-001, etc."
          />
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
              Create Movement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
