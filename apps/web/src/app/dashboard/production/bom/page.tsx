'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Select,
  Input,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import { Plus, Trash2 } from 'lucide-react';

interface Material {
  materialId: string;
  quantity: number;
}

export default function BOMPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    materials: [] as Material[],
  });
  const [newMaterial, setNewMaterial] = useState({ materialId: '', quantity: '' });

  const { data: bomsData, isLoading } = useQuery({
    queryKey: ['boms'],
    queryFn: () => api.getBOMs(),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
  });

  // Handle both plain array and paginated { data: { data: [], meta } } API shapes
  const boms = Array.isArray(bomsData?.data)
    ? bomsData.data
    : bomsData?.data?.data ?? [];
  const products = Array.isArray(productsData?.data)
    ? productsData.data
    : productsData?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createBOM(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      setIsModalOpen(false);
      setFormData({ productId: '', materials: [] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteBOM(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
    },
  });

  const addMaterial = () => {
    if (newMaterial.materialId && newMaterial.quantity) {
      setFormData({
        ...formData,
        materials: [
          ...formData.materials,
          { materialId: newMaterial.materialId, quantity: parseInt(newMaterial.quantity) },
        ],
      });
      setNewMaterial({ materialId: '', quantity: '' });
    }
  };

  const removeMaterial = (index: number) => {
    setFormData({
      ...formData,
      materials: formData.materials.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.productId && formData.materials.length > 0) {
      createMutation.mutate({
        productId: formData.productId,
        items: formData.materials,
      });
    }
  };

  // Group BOMs by product and expand items using products list
  const groupedBOMs = boms.reduce((acc: any, bom: any) => {
    const productId = bom.productId;
    if (!acc[productId]) {
      acc[productId] = {
        product: bom.product,
        materials: [],
      };
    }

    (bom.items || []).forEach((item: any) => {
      const material = products.find((p: any) => p.id === item.materialId);
      acc[productId].materials.push({
        id: bom.id, // keep BOM id for now for delete
        material,
        quantity: item.quantity,
      });
    });

    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill of Materials</h1>
          <p className="text-gray-500">Define product compositions</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add BOM
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {Object.values(groupedBOMs).map((group: any) => (
            <Card key={group.product?.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{group.product?.name}</span>
                  <span className="text-sm font-normal text-gray-500">
                    {group.product?.sku}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Quantity Required</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.materials.map((bom: any) => (
                      <TableRow key={bom.id}>
                        <TableCell className="font-medium">{bom.material?.name}</TableCell>
                        <TableCell className="font-mono text-xs">{bom.material?.sku}</TableCell>
                        <TableCell className="text-right">{bom.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Remove this material from BOM?')) {
                                deleteMutation.mutate(bom.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
          {Object.keys(groupedBOMs).length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No BOMs defined. Create one to get started.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create BOM Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Bill of Materials"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Finished Product"
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            options={[
              { value: '', label: 'Select Product' },
              ...products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name}` })),
            ]}
            required
          />

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Materials</h4>
            
            {formData.materials.length > 0 && (
              <div className="mb-4 space-y-2">
                {formData.materials.map((mat, index) => {
                  const product = products.find((p: any) => p.id === mat.materialId);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span>{product?.name || mat.materialId}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">Qty: {mat.quantity}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMaterial(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Select
                value={newMaterial.materialId}
                onChange={(e) => setNewMaterial({ ...newMaterial, materialId: e.target.value })}
                options={[
                  { value: '', label: 'Select Material' },
                  ...products
                    .filter((p: any) => p.id !== formData.productId)
                    .map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name}` })),
                ]}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Qty"
                value={newMaterial.quantity}
                onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })}
                className="w-24"
                min={1}
              />
              <Button type="button" variant="outline" onClick={addMaterial}>
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
              isLoading={createMutation.isPending}
              disabled={!formData.productId || formData.materials.length === 0}
            >
              Create BOM
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
