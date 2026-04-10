export type WebhookEventType =
  | 'nuevo_registro'
  | 'pago_exitoso'
  | 'pago_fallido'
  | 'upgrade_plan'
  | 'downgrade_plan'
  | 'cancelacion'
  | 'reactivacion'
  | 'trial_expirado'
  | 'login_importante'
  | 'feature_usada'
  | 'datos_actualizados'
  | 'reserva_cita';

export interface WebhookPayload {
  event: WebhookEventType;
  saas: string;
  timestamp: string;
  webhook_id: string;
  data: {
    cliente: {
      email: string;
      nombre: string;
      telefono?: string;
      pais?: string;
      empresa?: string;
    };
    suscripcion?: {
      plan: 'trial' | 'mensual' | 'anual';
      duracion_dias?: number;
      monto: number;
      moneda?: string;
      metodo_pago?: string;
      payment_provider_id?: string;
    };
    // Datos específicos para reserva de cita
    reserva?: {
      fecha: string;        // ISO 8601: 2026-04-15T10:00:00Z
      duracion_minutos: number;
      motivo?: string;
      notas?: string;
      ubicacion?: string;   // "online", "oficina", dirección
    };
    metadata?: {
      fuente: string;
      campana?: string;
      dispositivo: string;
      navegador: string;
      ip: string;
      user_agent: string;
      landing_page?: string;
      referrer?: string;
    };
  };
}

export const NOTIFIABLE_EVENTS: Record<WebhookEventType, { notify: boolean; critical: boolean }> = {
  nuevo_registro: { notify: true, critical: false },
  pago_exitoso: { notify: true, critical: false },
  pago_fallido: { notify: true, critical: true },
  upgrade_plan: { notify: true, critical: false },
  downgrade_plan: { notify: true, critical: false },
  cancelacion: { notify: true, critical: true },
  reactivacion: { notify: true, critical: false },
  trial_expirado: { notify: true, critical: false },
  login_importante: { notify: false, critical: false },
  feature_usada: { notify: false, critical: false },
  datos_actualizados: { notify: false, critical: false },
  reserva_cita: { notify: true, critical: false },
};
