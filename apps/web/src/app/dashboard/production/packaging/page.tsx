'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function PackagingReportPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    aktivitas: '',
    tenagaPerempuan: '',
    tenagaLaki: '',
    hasilPackaging: '',
    hpp: '',
  });

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['packagingReports', filterFrom, filterTo],
    queryFn: () =>
      api.getPackagingReports(
        filterFrom || filterTo ? { from: filterFrom || undefined, to: filterTo || undefined } : undefined,
      ),
  });

  const reports = Array.isArray(reportsData?.data)
    ? reportsData.data
    : reportsData?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createPackagingReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingReports'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updatePackagingReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingReports'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePackagingReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingReports'] });
    },
  });

  const openModal = (report?: any) => {
    if (report) {
      setEditingId(report.id);
      setFormData({
        date: report.date?.slice?.(0, 10) ?? new Date().toISOString().slice(0, 10),
        aktivitas: report.aktivitas ?? '',
        tenagaPerempuan: String(report.tenagaPerempuan ?? ''),
        tenagaLaki: String(report.tenagaLaki ?? ''),
        hasilPackaging: String(report.hasilPackaging ?? ''),
        hpp: String(report.hpp ?? ''),
      });
    } else {
      setEditingId(null);
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        aktivitas: '',
        tenagaPerempuan: '',
        tenagaLaki: '',
        hasilPackaging: '',
        hpp: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      date: formData.date,
      aktivitas: formData.aktivitas,
      tenagaPerempuan: formData.tenagaPerempuan ? parseInt(formData.tenagaPerempuan, 10) : 0,
      tenagaLaki: formData.tenagaLaki ? parseInt(formData.tenagaLaki, 10) : 0,
      hasilPackaging: formData.hasilPackaging ? parseInt(formData.hasilPackaging, 10) : 0,
      hpp: formData.hpp ? parseFloat(formData.hpp) : 0,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Packaging</h1>
          <p className="text-gray-500">
            Aktivitas produksi: tenaga, hasil packaging, dan HPP
          </p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Laporan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Dari:</span>
              <Input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sampai:</span>
              <Input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center h-32 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Aktivitas</TableHead>
                  <TableHead className="text-right">Tenaga (P)</TableHead>
                  <TableHead className="text-right">Tenaga (L)</TableHead>
                  <TableHead className="text-right">Hasil Packaging</TableHead>
                  <TableHead className="text-right">HPP</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report: any) => (
                  <TableRow key={report.id}>
                    <TableCell>{formatDate(report.date)}</TableCell>
                    <TableCell className="font-medium">{report.aktivitas}</TableCell>
                    <TableCell className="text-right">
                      {report.tenagaPerempuan}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.tenagaLaki}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.hasilPackaging?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(report.hpp ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal(report)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                'Hapus laporan packaging ini?',
                              )
                            ) {
                              deleteMutation.mutate(report.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {reports.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-gray-500 py-8"
                    >
                      Belum ada laporan packaging. Klik &quot;Tambah Laporan&quot;
                      untuk menambah.
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
        title={editingId ? 'Edit Laporan Packaging' : 'Tambah Laporan Packaging'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tanggal"
            type="date"
            value={formData.date}
            onChange={(e) =>
              setFormData({ ...formData, date: e.target.value })
            }
            required
          />
          <Input
            label="Aktivitas"
            value={formData.aktivitas}
            onChange={(e) =>
              setFormData({ ...formData, aktivitas: e.target.value })
            }
            placeholder="Contoh: Packaging Krupuk Udang"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tenaga Perempuan"
              type="number"
              min={0}
              value={formData.tenagaPerempuan}
              onChange={(e) =>
                setFormData({ ...formData, tenagaPerempuan: e.target.value })
              }
            />
            <Input
              label="Tenaga Laki-laki"
              type="number"
              min={0}
              value={formData.tenagaLaki}
              onChange={(e) =>
                setFormData({ ...formData, tenagaLaki: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hasil Packaging (qty)"
              type="number"
              min={0}
              value={formData.hasilPackaging}
              onChange={(e) =>
                setFormData({ ...formData, hasilPackaging: e.target.value })
              }
            />
            <Input
              label="HPP (Rp)"
              type="number"
              min={0}
              step="0.01"
              value={formData.hpp}
              onChange={(e) =>
                setFormData({ ...formData, hpp: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={
                createMutation.isPending || updateMutation.isPending
              }
            >
              {editingId ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
