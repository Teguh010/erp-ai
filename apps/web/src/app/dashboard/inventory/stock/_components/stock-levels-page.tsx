'use client';

import { useMemo, useState } from 'react';
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

export type StockLevelsVariant = 'finished' | 'materials';

export function StockLevelsPage({ variant }: { variant: StockLevelsVariant }) {
  const [warehouseId, setWarehouseId] = useState('');

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.getWarehouses(),
  });

  const stockParams = useMemo(
    () => ({
      warehouseId: warehouseId || undefined,
      limit: 500,
      ...(variant === 'finished'
        ? { finishedGoodsOnly: true as const }
        : { procurementItemsOnly: true as const }),
    }),
    [warehouseId, variant],
  );

  const { data: stockData, isLoading } = useQuery({
    queryKey: ['stock', variant, stockParams],
    queryFn: () => api.getStock(stockParams),
  });

  const warehouses = warehousesData?.data || [];
  const stocks = Array.isArray(stockData?.data)
    ? stockData.data
    : stockData?.data?.data ?? [];

  const title = variant === 'finished' ? 'Stok produk jadi' : 'Stok bahan & kemasan';
  const subtitle =
    variant === 'finished'
      ? 'Saldo per gudang untuk barang kategori Barang Jadi'
      : 'Saldo per gudang untuk bahan baku, tambahan, dan kemasan';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500">{subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Select
              value={warehouseId || warehouses[0]?.id || ''}
              onChange={(e) => setWarehouseId(e.target.value)}
              options={warehouses.map((w: any) => ({ value: w.id, label: w.name }))}
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
                  <TableHead>Produk</TableHead>
                  <TableHead>Gudang</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.map((stock: any) => {
                  const isZeroStock = stock.quantity === 0;
                  return (
                    <TableRow key={stock.id}>
                      <TableCell className="font-medium">{stock.product?.name}</TableCell>
                      <TableCell>{stock.warehouse?.name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {stock.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {isZeroStock ? (
                          <Badge variant="warning" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            Kosong
                          </Badge>
                        ) : (
                          <Badge variant="success">Ada stok</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {stocks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      Tidak ada data stok
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
