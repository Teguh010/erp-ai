'use client';

import { useState, useEffect } from 'react';
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
  price: number;
}

type SalesOrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

function toInputDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function toISOFromDateInput(ymd: string): string {
  return new Date(ymd).toISOString();
}

const SALES_STATUS_OPTIONS: { value: SalesOrderStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

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
  const [transitionModal, setTransitionModal] = useState<{
    order: any;
    nextStatus: SalesOrderStatus;
  } | null>(null);
  const [transitionDateInput, setTransitionDateInput] = useState('');
  const [milestoneDraft, setMilestoneDraft] = useState({
    expectedDeliveryDate: '',
    shippingDate: '',
    receivedDate: '',
    productReviewDate: '',
    poReceivedDate: '',
  });

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
    mutationFn: (vars: {
      id: string;
      status: SalesOrderStatus;
      shippingDate?: string;
      receivedDate?: string;
      productReviewDate?: string;
      poReceivedDate?: string;
    }) => {
      const { id, ...body } = vars;
      return api.updateSalesOrderStatus(id, body);
    },
    onSuccess: (res: any) => {
      const updated = res?.data;
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      setTransitionModal(null);
      setSelectedOrder((prev: any) =>
        prev && updated && prev.id === updated.id ? { ...prev, ...updated } : prev
      );
    },
  });

  const patchMilestonesMutation = useMutation({
    mutationFn: (vars: {
      id: string;
      expectedDeliveryDate?: string | null;
      shippingDate?: string;
      receivedDate?: string;
      productReviewDate?: string;
      poReceivedDate?: string;
    }) => {
      const { id, ...body } = vars;
      return api.patchSalesOrderMilestones(id, body);
    },
    onSuccess: (res: any) => {
      const updated = res?.data;
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setSelectedOrder((prev: any) =>
        prev && updated && prev.id === updated.id ? { ...prev, ...updated } : prev
      );
    },
  });

  useEffect(() => {
    if (selectedOrder && isDetailModalOpen) {
      setMilestoneDraft({
        expectedDeliveryDate: toInputDate(selectedOrder.expectedDeliveryDate),
        shippingDate: toInputDate(selectedOrder.shippingDate),
        receivedDate: toInputDate(selectedOrder.receivedDate),
        productReviewDate: toInputDate(selectedOrder.productReviewDate),
        poReceivedDate: toInputDate(selectedOrder.poReceivedDate),
      });
    }
  }, [selectedOrder, isDetailModalOpen]);

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

  const openStatusTransition = (order: any, nextStatus: SalesOrderStatus) => {
    if (nextStatus === 'PROCESSING') {
      setTransitionDateInput(order.poReceivedDate ? toInputDate(order.poReceivedDate) : todayInput());
    } else if (nextStatus === 'SHIPPED') {
      setTransitionDateInput(order.shippingDate ? toInputDate(order.shippingDate) : todayInput());
    } else if (nextStatus === 'COMPLETED') {
      setTransitionDateInput(order.receivedDate ? toInputDate(order.receivedDate) : '');
    } else {
      setTransitionDateInput('');
    }
    setTransitionModal({ order, nextStatus });
  };

  const confirmStatusTransition = () => {
    if (!transitionModal) return;
    const { order, nextStatus } = transitionModal;
    const payload: {
      id: string;
      status: SalesOrderStatus;
      shippingDate?: string;
      receivedDate?: string;
      poReceivedDate?: string;
    } = { id: order.id, status: nextStatus };

    if (nextStatus === 'PROCESSING') {
      if (!transitionDateInput) return;
      payload.poReceivedDate = toISOFromDateInput(transitionDateInput);
    } else if (nextStatus === 'SHIPPED') {
      if (!transitionDateInput) return;
      payload.shippingDate = toISOFromDateInput(transitionDateInput);
    } else if (nextStatus === 'COMPLETED' && transitionDateInput) {
      payload.receivedDate = toISOFromDateInput(transitionDateInput);
    }

    updateStatusMutation.mutate(payload);
  };

  const proceedStatusChange = (order: any, newStatus: SalesOrderStatus) => {
    if (newStatus === order.status) return;

    if (newStatus === 'CANCELLED') {
      if (!confirm('Yakin ingin membatalkan order ini?')) return;
      updateStatusMutation.mutate({ id: order.id, status: 'CANCELLED' });
      return;
    }

    if (newStatus === 'PENDING') {
      if (!confirm('Ubah status kembali ke Menunggu?')) return;
      updateStatusMutation.mutate({ id: order.id, status: 'PENDING' });
      return;
    }

    if (newStatus === 'PROCESSING') {
      if (order.poReceivedDate) {
        updateStatusMutation.mutate({ id: order.id, status: 'PROCESSING' });
      } else {
        openStatusTransition(order, 'PROCESSING');
      }
      return;
    }

    if (newStatus === 'SHIPPED') {
      if (order.shippingDate) {
        updateStatusMutation.mutate({ id: order.id, status: 'SHIPPED' });
      } else {
        openStatusTransition(order, 'SHIPPED');
      }
      return;
    }

    if (newStatus === 'COMPLETED') {
      openStatusTransition(order, 'COMPLETED');
    }
  };

  const transitionModalLabel = (): { title: string; description: string; inputLabel: string; optional?: boolean } => {
    if (!transitionModal) {
      return { title: '', description: '', inputLabel: '' };
    }
    const { nextStatus } = transitionModal;
    if (nextStatus === 'PROCESSING') {
      return {
        title: 'Move to Processing',
        description:
          'Use when the buyer’s purchase order is received. The date records when the PO was received.',
        inputLabel: 'PO received date',
      };
    }
    if (nextStatus === 'SHIPPED') {
      return {
        title: 'Mark as Shipped',
        description: 'Stock is deducted when the order ships. Set the actual shipping date.',
        inputLabel: 'Shipping date',
      };
    }
    if (nextStatus === 'COMPLETED') {
      return {
        title: 'Mark as Completed',
        description: 'Optional: record when product was received back from the buyer, if applicable.',
        inputLabel: 'Received from buyer',
        optional: true,
      };
    }
    return { title: 'Ubah status', description: '', inputLabel: '' };
  };

  const saveMilestoneDates = () => {
    if (!selectedOrder) return;
    const orig = selectedOrder;
    const payload: {
      expectedDeliveryDate?: string | null;
      shippingDate?: string;
      receivedDate?: string;
      productReviewDate?: string;
      poReceivedDate?: string;
    } = {};

    const origExpected = toInputDate(orig.expectedDeliveryDate);
    if (milestoneDraft.expectedDeliveryDate !== origExpected) {
      if (milestoneDraft.expectedDeliveryDate) {
        payload.expectedDeliveryDate = toISOFromDateInput(milestoneDraft.expectedDeliveryDate);
      } else {
        payload.expectedDeliveryDate = null;
      }
    }

    if (milestoneDraft.shippingDate !== toInputDate(orig.shippingDate) && milestoneDraft.shippingDate) {
      payload.shippingDate = toISOFromDateInput(milestoneDraft.shippingDate);
    }
    if (milestoneDraft.receivedDate !== toInputDate(orig.receivedDate) && milestoneDraft.receivedDate) {
      payload.receivedDate = toISOFromDateInput(milestoneDraft.receivedDate);
    }
    if (
      milestoneDraft.productReviewDate !== toInputDate(orig.productReviewDate) &&
      milestoneDraft.productReviewDate
    ) {
      payload.productReviewDate = toISOFromDateInput(milestoneDraft.productReviewDate);
    }
    if (milestoneDraft.poReceivedDate !== toInputDate(orig.poReceivedDate) && milestoneDraft.poReceivedDate) {
      payload.poReceivedDate = toISOFromDateInput(milestoneDraft.poReceivedDate);
    }

    if (Object.keys(payload).length === 0) {
      return;
    }
    patchMilestonesMutation.mutate({ id: orig.id, ...payload });
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
          <p className="text-gray-500">
            PO received → Processing; ship with a shipping date; milestones (review, returns) in order details.
          </p>
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
                  <TableHead>PO received</TableHead>
                  <TableHead>Shipping</TableHead>
                  <TableHead className="text-right w-14">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm uppercase">
                      {order.id.substring(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">{order.customer?.name}</TableCell>
                    <TableCell>
                      <Select
                        aria-label="Ubah status order"
                        value={order.status}
                        onChange={(e) =>
                          proceedStatusChange(order, e.target.value as SalesOrderStatus)
                        }
                        options={SALES_STATUS_OPTIONS}
                        className="min-w-[9.5rem] max-w-[11rem] text-sm py-1.5"
                        disabled={
                          updateStatusMutation.isPending &&
                          updateStatusMutation.variables?.id === order.id
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {getFormatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {order.expectedDeliveryDate ? getFormatDate(order.expectedDeliveryDate) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {order.poReceivedDate ? getFormatDate(order.poReceivedDate) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {order.shippingDate ? getFormatDate(order.shippingDate) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailModalOpen(true);
                        }}
                        aria-label="Lihat detail order"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-12">
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
                  ...products.map((p: any) => ({ value: p.id, label: `${p.sku || 'N/A'} - ${p.name}` })),
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
        title={`Order Details - ${selectedOrder?.id?.substring(0, 8).toUpperCase()}`}
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
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-medium">{getFormatCurrency(selectedOrder.totalAmount)}</p>
              </div>
              <div className="col-span-2">
                <Select
                  label="Status"
                  value={selectedOrder.status}
                  onChange={(e) =>
                    proceedStatusChange(selectedOrder, e.target.value as SalesOrderStatus)
                  }
                  options={SALES_STATUS_OPTIONS}
                  disabled={
                    updateStatusMutation.isPending &&
                    updateStatusMutation.variables?.id === selectedOrder.id
                  }
                />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3 bg-gray-50/80">
              <h4 className="font-medium text-gray-900">Jadwal &amp; tanggal milestone</h4>
              <p className="text-xs text-gray-500">
                Sesuaikan rencana pengiriman dan tanggal milestone tanpa mengubah status. Hanya bagian yang
                berubah yang disimpan.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Expected delivery (rencana)"
                  type="date"
                  value={milestoneDraft.expectedDeliveryDate}
                  onChange={(e) =>
                    setMilestoneDraft((d) => ({ ...d, expectedDeliveryDate: e.target.value }))
                  }
                />
                <Input
                  label="PO received"
                  type="date"
                  value={milestoneDraft.poReceivedDate}
                  onChange={(e) =>
                    setMilestoneDraft((d) => ({ ...d, poReceivedDate: e.target.value }))
                  }
                />
                <Input
                  label="Shipping"
                  type="date"
                  value={milestoneDraft.shippingDate}
                  onChange={(e) =>
                    setMilestoneDraft((d) => ({ ...d, shippingDate: e.target.value }))
                  }
                />
                <Input
                  label="Product review"
                  type="date"
                  value={milestoneDraft.productReviewDate}
                  onChange={(e) =>
                    setMilestoneDraft((d) => ({ ...d, productReviewDate: e.target.value }))
                  }
                />
                <Input
                  label="Received from buyer"
                  type="date"
                  value={milestoneDraft.receivedDate}
                  onChange={(e) =>
                    setMilestoneDraft((d) => ({ ...d, receivedDate: e.target.value }))
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={patchMilestonesMutation.isPending}
                onClick={saveMilestoneDates}
              >
                {patchMilestonesMutation.isPending ? 'Menyimpan…' : 'Simpan jadwal & milestone'}
              </Button>
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
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!transitionModal}
        onClose={() => setTransitionModal(null)}
        title={transitionModalLabel().title}
        size="md"
      >
        {transitionModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{transitionModalLabel().description}</p>
            {['PROCESSING', 'SHIPPED', 'COMPLETED'].includes(transitionModal.nextStatus) && (
              <Input
                label={transitionModalLabel().inputLabel}
                type="date"
                value={transitionDateInput}
                onChange={(e) => setTransitionDateInput(e.target.value)}
                required={!transitionModalLabel().optional}
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setTransitionModal(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  updateStatusMutation.isPending ||
                  (transitionModal.nextStatus === 'PROCESSING' && !transitionDateInput) ||
                  (transitionModal.nextStatus === 'SHIPPED' && !transitionDateInput)
                }
                onClick={confirmStatusTransition}
              >
                {updateStatusMutation.isPending ? 'Updating…' : 'Confirm'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
