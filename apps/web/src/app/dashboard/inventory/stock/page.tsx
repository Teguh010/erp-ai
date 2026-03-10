'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Card,
  CardHeader,
  CardContent,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

export default function StockPage() {
  const [warehouseId, setWarehouseId] = useState('');

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.getWarehouses(),
  });

  const { data: stockData, isLoading } = useQuery({
    queryKey: ['stock', warehouseId],
    queryFn: () => api.getStock({ warehouseId: warehouseId || undefined }),
  });

  const warehouses = warehousesData?.data || [];
  const stocks = stockData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Levels</h1>
        <p className="text-gray-500">View current inventory stock across warehouses</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              options={[
                { value: '', label: 'All Warehouses' },
                ...warehouses.map((w: any) => ({ value: w.id, label: w.name })),
              ]}
              className="w-64"
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
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.map((stock: any) => {
                  const isLowStock = stock.quantity <= (stock.product?.reorderLevel || 0);
                  return (
                    <TableRow key={stock.id}>
                      <TableCell className="font-medium">{stock.product?.name}</TableCell>
                      <TableCell className="font-mono text-xs">{stock.product?.sku}</TableCell>
                      <TableCell>{stock.warehouse?.name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {stock.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {stock.product?.reorderLevel || '-'}
                      </TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge variant="warning" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success">In Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {stocks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No stock records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
