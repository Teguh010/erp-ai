'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Card,
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
} from '@/components/ui';
import { Plus, Eye, Trash2 } from 'lucide-react';

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  volumePerCartonM3?: number;
  /** Resolved total m³ for display */
  volumeAllCartonM3?: number | null;
  /** User typed total m³; if false, server derives from qty × per carton */
  volumeAllManual: boolean;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID');
}

function formatM3(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toLocaleString('id-ID', { maximumFractionDigits: 4 })} m³`;
}

/** Satu master `Product` dipakai untuk stok/penjualan/pembelian; di PO ditampilkan sebagai bahan/item + kategori & satuan. */
function purchaseLineLabel(p: any | null | undefined, fallbackId?: string) {
  if (!p) return fallbackId ?? '—';
  const cat = p.category?.name;
  const unit = p.unit?.name;
  const name = p.name ?? '';
  const core = cat ? `${cat} — ${name}` : name;
  return unit ? `${core}` : core;
}

type POStatus = 'DRAFT' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';

const PO_STATUS_OPTIONS: { value: POStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [formData, setFormData] = useState({
    supplierId: '',
    title: '',
    expectedDelivery: '',
    notes: '',
    items: [] as OrderItem[],
  });
  const [newItem, setNewItem] = useState({
    productId: '',
    quantity: '',
    unitPrice: '',
    volumePerCartonM3: '',
    volumeAllCartonM3: '',
  });
  const [receiveModal, setReceiveModal] = useState<{
    order: any;
    warehouseId: string;
  } | null>(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => api.getPurchaseOrders(),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.getSuppliers(),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', 'po-dropdown', 'procurement'],
    queryFn: () => api.getProducts({ limit: 500, procurementItemsOnly: true }),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.getWarehouses(),
  });

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
    onSuccess: (res: any) => {
      const updated = res?.data;
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setReceiveModal(null);
      setSelectedOrder((prev: any) =>
        prev && updated && prev.id === updated.id ? { ...prev, ...updated } : prev
      );
    },
  });

  const resetForm = () => {
    setFormData({
      supplierId: '',
      title: '',
      expectedDelivery: '',
      notes: '',
      items: [],
    });
    setNewItem({
      productId: '',
      quantity: '',
      unitPrice: '',
      volumePerCartonM3: '',
      volumeAllCartonM3: '',
    });
  };

  const addItem = () => {
    if (!newItem.productId || !newItem.quantity || !newItem.unitPrice) return;

    const qty = parseInt(newItem.quantity, 10);
    const unitPrice = parseFloat(newItem.unitPrice);
    const volPer =
      newItem.volumePerCartonM3.trim() !== '' ? parseFloat(newItem.volumePerCartonM3) : undefined;
    const volAllRaw = newItem.volumeAllCartonM3.trim();
    const volumeAllManual = volAllRaw !== '';
    const volAllParsed = volumeAllManual ? parseFloat(volAllRaw) : undefined;
    if (volumeAllManual && (volAllParsed === undefined || Number.isNaN(volAllParsed))) return;

    const derivedAll = volPer != null && !Number.isNaN(volPer) ? qty * volPer : undefined;
    const volumeAllCartonM3 = volumeAllManual ? volAllParsed! : derivedAll ?? null;

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: newItem.productId,
          quantity: qty,
          unitPrice,
          volumePerCartonM3: volPer,
          volumeAllCartonM3,
          volumeAllManual,
        },
      ],
    });
    setNewItem({
      productId: '',
      quantity: '',
      unitPrice: '',
      volumePerCartonM3: '',
      volumeAllCartonM3: '',
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || formData.items.length === 0) return;

    const items = formData.items.map((item) => {
      const row: {
        productId: string;
        quantity: number;
        unitPrice: number;
        volumePerCartonM3?: number;
        volumeAllCartonM3?: number;
      } = {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
      if (item.volumePerCartonM3 != null) {
        row.volumePerCartonM3 = item.volumePerCartonM3;
      }
      if (item.volumeAllManual && item.volumeAllCartonM3 != null) {
        row.volumeAllCartonM3 = item.volumeAllCartonM3;
      }
      return row;
    });

    createMutation.mutate({
      supplierId: formData.supplierId,
      title: formData.title.trim() || undefined,
      expectedDeliveryDate: formData.expectedDelivery
        ? new Date(formData.expectedDelivery).toISOString()
        : undefined,
      notes: formData.notes.trim() || undefined,
      items,
    });
  };

  const proceedPOStatusChange = (order: any, newStatus: POStatus) => {
    if (newStatus === order.status) return;

    if (newStatus === 'CANCELLED') {
      if (!confirm('Cancel this purchase order?')) return;
      updateStatusMutation.mutate({ id: order.id, status: newStatus });
      return;
    }

    if (newStatus === 'RECEIVED') {
      if (!warehouses.length) {
        alert('No warehouse configured. Add a warehouse before receiving.');
        return;
      }
      const defaultWh = warehouses[0]?.id ?? '';
      setReceiveModal({ order, warehouseId: defaultWh });
      return;
    }

    if (newStatus === 'DRAFT') {
      if (!confirm('Set status back to Draft?')) return;
    }

    updateStatusMutation.mutate({ id: order.id, status: newStatus });
  };

  const confirmReceive = () => {
    if (!receiveModal?.warehouseId) return;
    const valid = warehouses.some((w: any) => w.id === receiveModal.warehouseId);
    if (!valid) return;
    updateStatusMutation.mutate({
      id: receiveModal.order.id,
      status: 'RECEIVED',
      warehouseId: receiveModal.warehouseId,
    });
  };

  const poLabel = (order: any) =>
    order.title?.trim() || `PO-${String(order.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;

  const totalAmount = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500">
            Dropdown PO hanya menampilkan <strong>Bahan Baku, Bahan Tambahan, dan Kemasan</strong> — bukan barang
            jadi. 
          </p>
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
                  <TableHead>PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Expected delivery</TableHead>
                  <TableHead className="text-right w-14">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{poLabel(order)}</TableCell>
                    <TableCell>{order.supplier?.name}</TableCell>
                    <TableCell>
                      <Select
                        aria-label="Change PO status"
                        value={order.status}
                        onChange={(e) => proceedPOStatusChange(order, e.target.value as POStatus)}
                        options={PO_STATUS_OPTIONS}
                        className="min-w-[9.5rem] max-w-[11rem] text-sm py-1.5"
                        disabled={
                          updateStatusMutation.isPending &&
                          updateStatusMutation.variables?.id === order.id
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>
                      {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="View PO detail"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
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
                { value: '', label: 'Select supplier' },
                ...suppliers.map((s: any) => ({ value: s.id, label: s.name })),
              ]}
              required
            />
            <Input
              label="PO title (optional)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Jersey order (PO SI)"
            />
            <Input
              label="Expected delivery"
              type="date"
              value={formData.expectedDelivery}
              onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
            />
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Line items</h4>
            <p className="text-xs text-gray-500">
              Qty = jumlah karton. Isi <strong>Volume all (m³)</strong> hanya jika ingin override; kosongkan
              untuk menghitung qty × volume per karton. Daftar item = bahan/kemasan (bukan barang jadi).
            </p>

            {formData.items.length > 0 && (
              <div className="mb-4 overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bahan / item</TableHead>
                      <TableHead className="text-right">Qty (carton)</TableHead>
                      <TableHead className="text-right">Price / carton</TableHead>
                      <TableHead className="text-right">m³ / carton</TableHead>
                      <TableHead className="text-right">m³ total</TableHead>
                      <TableHead className="text-right">Total (IDR)</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => {
                      const product = products.find((p: any) => p.id === item.productId);
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {purchaseLineLabel(product, item.productId)}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right">{formatM3(item.volumePerCartonM3)}</TableCell>
                          <TableCell className="text-right">{formatM3(item.volumeAllCartonM3)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="text-right font-semibold px-3 py-2 border-t bg-gray-50">
                  Total: {formatCurrency(totalAmount)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-9">
                <Select
                  label="Bahan / item"
                  value={newItem.productId}
                  onChange={(e) => setNewItem({ ...newItem, productId: e.target.value })}
                  options={[
                    { value: '', label: 'Pilih bahan atau item…' },
                    ...products.map((p: any) => ({
                      value: p.id,
                      label: purchaseLineLabel(p),
                    })),
                  ]}
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  label="Qty (carton)"
                  type="number"
                  min={1}
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  className="min-w-0"
                />
              </div>
              <div className="md:col-span-4">
                <Input
                  label="Price / carton"
                  type="number"
                  min={0}
                  step="0.01"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                  className="min-w-0"
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  label="m³ / carton"
                  type="number"
                  min={0}
                  step="0.0001"
                  value={newItem.volumePerCartonM3}
                  onChange={(e) => setNewItem({ ...newItem, volumePerCartonM3: e.target.value })}
                  placeholder="optional"
                  className="min-w-0"
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  label="m³ total (manual)"
                  type="number"
                  min={0}
                  step="0.0001"
                  value={newItem.volumeAllCartonM3}
                  onChange={(e) => setNewItem({ ...newItem, volumeAllCartonM3: e.target.value })}
                  placeholder="auto if empty"
                  className="min-w-0"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="button" variant="outline" className="h-[42px] w-full" onClick={addItem}>
                  Add line
                </Button>
              </div>
            </div>
          </div>

          <Input
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes…"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.supplierId || formData.items.length === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create order'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`${selectedOrder ? poLabel(selectedOrder) : ''} — detail`}
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
                <p className="text-sm text-gray-500">Total amount</p>
                <p className="font-medium">{formatCurrency(selectedOrder.totalAmount)}</p>
              </div>
              {selectedOrder.title && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Title</p>
                  <p className="font-medium">{selectedOrder.title}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Expected delivery</p>
                <p className="font-medium">
                  {selectedOrder.expectedDeliveryDate
                    ? formatDate(selectedOrder.expectedDeliveryDate)
                    : '—'}
                </p>
              </div>
              <div className="col-span-2">
                <Select
                  label="Status"
                  value={selectedOrder.status}
                  onChange={(e) => proceedPOStatusChange(selectedOrder, e.target.value as POStatus)}
                  options={PO_STATUS_OPTIONS}
                  disabled={
                    updateStatusMutation.isPending &&
                    updateStatusMutation.variables?.id === selectedOrder.id
                  }
                />
              </div>
              {selectedOrder.notes && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div className="overflow-x-auto">
                <p className="text-sm text-gray-500 mb-2">Items</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bahan / item</TableHead>
                      <TableHead className="text-right">Qty (carton)</TableHead>
                      <TableHead className="text-right">Price / carton</TableHead>
                      <TableHead className="text-right">m³ / carton</TableHead>
                      <TableHead className="text-right">m³ total</TableHead>
                      <TableHead className="text-right">Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{purchaseLineLabel(item.product)}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatM3(item.volumePerCartonM3)}</TableCell>
                        <TableCell className="text-right">{formatM3(item.volumeAllCartonM3)}</TableCell>
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
              <p>Receiving uses the warehouse selected when you set status to Received.</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!receiveModal}
        onClose={() => setReceiveModal(null)}
        title="Receive goods — select warehouse"
        size="md"
      >
        {receiveModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Stock will be increased for each line item in this PO at the chosen warehouse.
            </p>
            <Select
              label="Warehouse"
              value={receiveModal.warehouseId}
              onChange={(e) =>
                setReceiveModal((m) => (m ? { ...m, warehouseId: e.target.value } : null))
              }
              options={warehouses.map((w: any) => ({ value: w.id, label: w.name }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReceiveModal(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!receiveModal.warehouseId || updateStatusMutation.isPending}
                onClick={confirmReceive}
              >
                {updateStatusMutation.isPending ? 'Updating…' : 'Confirm received'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
