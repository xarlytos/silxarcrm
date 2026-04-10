'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cliente, Pagination } from '@/types';
import { formatDate } from '@/lib/utils';

interface ClientTableProps {
  clientes: Cliente[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
}

export default function ClientTable({ clientes, pagination, onPageChange, onSearch }: ClientTableProps) {
  const [search, setSearch] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(search);
  };

  return (
    <div className="bg-expo-white border border-expo-border rounded-comfortable overflow-hidden">
      {/* Search */}
      <div className="px-6 py-4 border-b border-expo-border">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="flex-1 px-4 py-2.5 rounded-subtle border border-expo-input bg-expo-white text-[15px] text-expo-near focus:outline-none focus:ring-2 focus:ring-expo-focus/30 placeholder:text-expo-silver"
          />
          <button type="submit" className="px-5 py-2.5 bg-expo-black text-white rounded-subtle text-[15px] font-medium">
            Buscar
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-expo-border bg-expo-cloud/50">
              <th className="text-left px-6 py-3.5 text-[13px] font-medium uppercase tracking-wider text-expo-silver">Cliente</th>
              <th className="text-left px-6 py-3.5 text-[13px] font-medium uppercase tracking-wider text-expo-silver">SaaS</th>
              <th className="text-left px-6 py-3.5 text-[13px] font-medium uppercase tracking-wider text-expo-silver">Estado</th>
              <th className="text-left px-6 py-3.5 text-[13px] font-medium uppercase tracking-wider text-expo-silver">Plan</th>
              <th className="text-left px-6 py-3.5 text-[13px] font-medium uppercase tracking-wider text-expo-silver">Registro</th>
              <th className="text-left px-6 py-3.5 text-[13px] font-medium uppercase tracking-wider text-expo-silver"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-expo-border/50">
            {clientes.map((cliente) => (
              <tr key={cliente.id} className="hover:bg-expo-cloud/40 transition-colors">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-pill bg-expo-black flex items-center justify-center shrink-0">
                      <span className="text-white text-[12px] font-semibold">{cliente.nombre?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-[15px] font-medium text-expo-near">{cliente.nombre}</p>
                      <p className="text-[13px] text-expo-silver">{cliente.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-[14px] text-expo-slate capitalize">{cliente.origenSaas}</td>
                <td className="px-6 py-3.5">
                  <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-subtle ${
                    cliente.estado === 'activo' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {cliente.estado}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-[14px] text-expo-slate capitalize">{cliente.suscripciones?.[0]?.planTipo || '-'}</td>
                <td className="px-6 py-3.5 text-[14px] text-expo-silver">{formatDate(cliente.fechaRegistro)}</td>
                <td className="px-6 py-3.5">
                  <Link href={`/dashboard/clientes/${cliente.id}`} className="text-[14px] font-medium text-expo-cobalt hover:underline">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-3.5 border-t border-expo-border flex items-center justify-between">
        <p className="text-[14px] text-expo-silver">{pagination.total} clientes</p>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-4 py-1.5 rounded-subtle border border-expo-input text-[14px] disabled:opacity-30 hover:bg-expo-cloud transition-colors"
          >
            Anterior
          </button>
          <span className="text-[14px] text-expo-slate px-3">{pagination.page}/{pagination.pages}</span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="px-4 py-1.5 rounded-subtle border border-expo-input text-[14px] disabled:opacity-30 hover:bg-expo-cloud transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
