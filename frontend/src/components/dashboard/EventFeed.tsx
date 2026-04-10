'use client';

import { useEffect, useState } from 'react';
import { Evento } from '@/types';
import { getSocket } from '@/lib/socket';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

interface EventFeedProps {
  initialEvents: Evento[];
  maxHeight?: string;
}

const eventLabels: Record<string, string> = {
  nuevo_registro: 'Registro',
  pago_exitoso: 'Pago',
  pago_fallido: 'Fallo',
  upgrade_plan: 'Upgrade',
  downgrade_plan: 'Downgrade',
  cancelacion: 'Baja',
  reactivacion: 'Reactivacion',
  trial_expirado: 'Trial exp.',
};

export default function EventFeed({ initialEvents, maxHeight = '460px' }: EventFeedProps) {
  const [events, setEvents] = useState<Evento[]>(initialEvents);

  useEffect(() => {
    const socket = getSocket();
    socket.on('nuevo_evento', (event: Evento) => {
      setEvents((prev) => [event, ...prev].slice(0, 50));
    });
    return () => { socket.off('nuevo_evento'); };
  }, []);

  return (
    <div className="bg-expo-white border border-expo-border rounded-comfortable overflow-hidden">
      <div className="px-6 py-4 border-b border-expo-border flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-expo-near">Actividad reciente</h3>
        <Link href="/dashboard/eventos" className="text-[13px] text-expo-cobalt hover:underline">
          Ver todo
        </Link>
      </div>
      <div className="divide-y divide-expo-border/50 overflow-y-auto" style={{ maxHeight }}>
        {events.length === 0 ? (
          <div className="px-6 py-12 text-center text-[14px] text-expo-silver">Sin eventos recientes</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="px-6 py-3.5 hover:bg-expo-cloud/60 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-subtle whitespace-nowrap ${
                  event.severidad === 'critico'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-expo-cloud text-expo-slate'
                }`}>
                  {eventLabels[event.tipo] || event.tipo}
                </span>
                <p className="text-[14px] font-medium text-expo-near truncate flex-1">
                  {event.cliente?.nombre || 'Sistema'}
                </p>
                <div className="text-right shrink-0">
                  <p className="text-[12px] text-expo-silver">{formatRelativeTime(event.fecha)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
