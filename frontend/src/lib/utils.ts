import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;
  return formatDate(date);
}

export function getEventColor(tipo: string): string {
  const critical = ['pago_fallido', 'cancelacion'];
  if (critical.includes(tipo)) return 'bg-red-50 text-red-600';
  return 'bg-expo-cloud text-expo-slate';
}

export function getEventIcon(tipo: string): string {
  const icons: Record<string, string> = {
    nuevo_registro: 'UserPlus',
    pago_exitoso: 'CreditCard',
    pago_fallido: 'AlertTriangle',
    upgrade_plan: 'TrendingUp',
    downgrade_plan: 'TrendingDown',
    cancelacion: 'UserMinus',
    reactivacion: 'RefreshCw',
    trial_expirado: 'Clock',
  };
  return icons[tipo] || 'Activity';
}
