'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import {
  Package,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboardStats(),
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['lowStock'],
    queryFn: () => api.getLowStock(),
  });

  const stats = dashboardData?.data;
  const lowStockItems = lowStockData?.data || [];

  const statCards = [
    {
      name: 'Total Products',
      value: stats?.totalProducts || 0,
      icon: <Package className="w-6 h-6 text-blue-600" />,
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Warehouses',
      value: stats?.totalWarehouses || 0,
      icon: <Warehouse className="w-6 h-6 text-green-600" />,
      bgColor: 'bg-green-50',
    },
    {
      name: 'Total Stock',
      value: stats?.totalStock?.toLocaleString() || 0,
      icon: <TrendingUp className="w-6 h-6 text-purple-600" />,
      bgColor: 'bg-purple-50',
    },
    {
      name: 'Low Stock Items',
      value: stats?.lowStockCount || 0,
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      bgColor: 'bg-red-50',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your ERP system.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>{stat.icon}</div>
                <div>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentMovements?.slice(0, 5).map((movement: any) => (
                <div key={movement.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        movement.movementType === 'IN' ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      {movement.movementType === 'IN' ? (
                        <ArrowDownRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {movement.product?.name || 'Product'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {movement.warehouse?.name} • {formatDateTime(movement.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        movement.movementType === 'IN' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {movement.movementType === 'IN' ? '+' : '-'}
                      {movement.quantity}
                    </p>
                    <Badge
                      variant={movement.movementType === 'IN' ? 'success' : 'danger'}
                      className="text-xs"
                    >
                      {movement.movementType}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!stats?.recentMovements || stats?.recentMovements.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No recent movements</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.slice(0, 5).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.product?.name}</p>
                    <p className="text-xs text-gray-500">{item.warehouse?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-600">{item.quantity} units</p>
                    <p className="text-xs text-gray-500">
                      Reorder: {item.product?.reorderLevel}
                    </p>
                  </div>
                </div>
              ))}
              {lowStockItems.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No low stock items</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
