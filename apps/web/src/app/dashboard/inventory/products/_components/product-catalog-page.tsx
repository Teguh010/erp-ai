'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
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
} from '@/components/ui';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';

const FINISHED_CATEGORY_NAME = 'Barang Jadi';
const MATERIAL_CATEGORY_NAMES = ['Bahan Baku', 'Bahan Tambahan', 'Kemasan'] as const;

export type ProductCatalogVariant = 'finished' | 'materials';

export function ProductCatalogPage({ variant }: { variant: ProductCatalogVariant }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    unitId: '',
    purchasePrice: '',
    salePrice: '',
  });

  const listParams = useMemo(
    () => ({
      limit: 500,
      search: search.trim() ? search.trim() : undefined,
      ...(variant === 'finished'
        ? { finishedGoodsOnly: true as const }
        : { procurementItemsOnly: true as const }),
    }),
    [search, variant],
  );

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', variant, listParams],
    queryFn: () => api.getProducts(listParams),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.getUnits(),
  });

  const products = Array.isArray(productsData?.data)
    ? productsData.data
    : productsData?.data?.data ?? [];
  const categories = categoriesData?.data || [];
  const units = unitsData?.data || [];

  const categoryOptions = useMemo(() => {
    if (variant === 'finished') {
      return categories.filter((c: any) => c.name === FINISHED_CATEGORY_NAME);
    }
    return categories.filter((c: any) =>
      MATERIAL_CATEGORY_NAMES.includes(c.name as (typeof MATERIAL_CATEGORY_NAMES)[number]),
    );
  }, [categories, variant]);

  const modalCategoryOptions = useMemo(() => {
    if (!editingProduct) return categoryOptions;
    const cur = categories.find((c: any) => c.id === editingProduct.categoryId);
    if (!cur) return categoryOptions;
    if (categoryOptions.some((c: any) => c.id === cur.id)) return categoryOptions;
    return [...categoryOptions, cur];
  }, [editingProduct, categoryOptions, categories]);

  const title = variant === 'finished' ? 'Produk jadi' : 'Bahan & kemasan';
  const subtitle =
    variant === 'finished'
      ? 'Katalog barang jual (kategori Barang Jadi)'
      : 'Bahan baku, tambahan, dan kemasan untuk produksi dan pembelian';
  const addLabel = variant === 'finished' ? 'Tambah produk jadi' : 'Tambah bahan / kemasan';

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const openModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        categoryId: product.categoryId,
        unitId: product.unitId || '',
        purchasePrice: (product.purchasePrice ?? 0).toString(),
        salePrice: (product.salePrice ?? 0).toString(),
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        categoryId: categoryOptions[0]?.id || '',
        unitId: units[0]?.id || '',
        purchasePrice: '',
        salePrice: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      purchasePrice: parseFloat(formData.purchasePrice),
      salePrice: parseFloat(formData.salePrice) || undefined,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500">{subtitle}</p>
        </div>
        <Button onClick={() => openModal()} disabled={!editingProduct && categoryOptions.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          {addLabel}
        </Button>
      </div>

      {!editingProduct && categoryOptions.length === 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Belum ada kategori yang sesuai di master data. Pastikan seed atau kategori (
          {variant === 'finished' ? FINISHED_CATEGORY_NAME : MATERIAL_CATEGORY_NAMES.join(', ')}) sudah
          ada.
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
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
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Harga beli</TableHead>
                  <TableHead>Harga jual</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category?.name || '-'}</TableCell>
                    <TableCell>{product.unit?.name || '-'}</TableCell>
                    <TableCell>{formatCurrency(product.purchasePrice ?? 0)}</TableCell>
                    <TableCell>{formatCurrency(product.salePrice ?? 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openModal(product)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Hapus produk ini?')) {
                              deleteMutation.mutate(product.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      Tidak ada data
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
        onClose={closeModal}
        title={editingProduct ? 'Ubah produk' : addLabel}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Kategori"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              options={modalCategoryOptions.map((c: any) => ({ value: c.id, label: c.name }))}
              required
            />
            <Select
              label="Satuan"
              value={formData.unitId}
              onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
              options={units.map((u: any) => ({ value: u.id, label: u.name }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Harga beli"
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              required
            />
            <Input
              label="Harga jual"
              type="number"
              value={formData.salePrice}
              onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingProduct ? 'Simpan' : 'Buat'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
