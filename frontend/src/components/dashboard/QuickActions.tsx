'use client';

import { Plus, CreditCard, Link2, FileText, Bell, Users } from 'lucide-react';
import Link from 'next/link';

const actions = [
  {
    icon: Plus,
    label: 'Nuevo Cliente',
    description: 'Registrar manualmente',
    href: '/dashboard/clientes/nuevo',
    color: 'bg-blue-100 text-blue-600'
  },
  {
    icon: CreditCard,
    label: 'Registrar Pago',
    description: 'Entrada de ingreso',
    href: '/dashboard/pagos/nuevo',
    color: 'bg-emerald-100 text-emerald-600'
  },
  {
    icon: Link2,
    label: 'Conectar SaaS',
    description: 'Nuevo webhook',
    href: '/dashboard/softwares/conectar',
    color: 'bg-violet-100 text-violet-600'
  },
  {
    icon: FileText,
    label: 'Ver Reportes',
    description: 'Análisis detallado',
    href: '/dashboard/metricas',
    color: 'bg-amber-100 text-amber-600'
  },
  {
    icon: Bell,
    label: 'Alertas',
    description: 'Configurar notif.',
    href: '/dashboard/config/alertas',
    color: 'bg-rose-100 text-rose-600'
  },
  {
    icon: Users,
    label: 'Todos Clientes',
    description: 'Ver listado completo',
    href: '/dashboard/clientes',
    color: 'bg-cyan-100 text-cyan-600'
  },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-start gap-3 p-4 rounded-xl bg-white border border-expo-border/60 hover:border-expo-cobalt/30 hover:shadow-md hover:shadow-expo-cobalt/5 transition-all duration-200 group"
          >
            <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-expo-near">{action.label}</p>
              <p className="text-xs text-expo-silver mt-0.5">{action.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
