/**
 * Silxar Tracker SDK
 * SDK oficial para enviar eventos de tracking desde tu CRM al sistema central
 *
 * @example
 * ```typescript
 * import { SilxarTracker } from '@silxar/tracker';
 *
 * const tracker = new SilxarTracker({
 *   apiKey: 'sk_xxx',
 *   endpoint: 'https://tu-crm-central.com/events'
 * });
 *
 * tracker.track('user_registered', {
 *   user_id: 'u_123',
 *   email: 'user@example.com',
 *   plan: 'premium'
 * });
 * ```
 */

export interface TrackerConfig {
  /** Tu API Key (obtenida del CRM Maestro) */
  apiKey: string;
  /** URL del endpoint de tracking (default: https://api.silxar.com/events) */
  endpoint?: string;
  /** ID del CRM (opcional, para identificación adicional) */
  crmId?: string;
  /** Habilitar modo debug (logs en consola) */
  debug?: boolean;
  /** Timeout en ms para las peticiones (default: 5000) */
  timeout?: number;
  /** Número de reintentos en caso de fallo (default: 3) */
  retries?: number;
  /** Intervalo entre reintentos en ms (default: 1000) */
  retryDelay?: number;
  /** Enviar eventos en batch (default: true) */
  batch?: boolean;
  /** Intervalo de flush del batch en ms (default: 5000) */
  flushInterval?: number;
  /** Tamaño máximo del batch (default: 20) */
  batchSize?: number;
}

export interface EventData {
  [key: string]: any;
}

export interface TrackOptions {
  /** Timestamp del evento (default: ahora) */
  timestamp?: string;
  /** ID único para deduplicación */
  eventId?: string;
  /** ID del usuario */
  userId?: string;
  /** Email del usuario */
  email?: string;
  /** ID de sesión */
  sessionId?: string;
  /** Datos adicionales */
  data?: EventData;
}

export interface TrackedEvent {
  event: string;
  crm_id?: string;
  timestamp: string;
  event_id?: string;
  user_id?: string;
  email?: string;
  session_id?: string;
  data: EventData;
}

interface QueuedEvent {
  event: string;
  options: TrackOptions;
  retries: number;
}

/**
 * Clase principal del Tracker
 */
export class SilxarTracker {
  private config: Required<TrackerConfig>;
  private queue: QueuedEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;

  constructor(config: TrackerConfig) {
    this.config = {
      endpoint: 'https://api.silxar.com/events',
      crmId: '',
      debug: false,
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
      batch: true,
      flushInterval: 5000,
      batchSize: 20,
      ...config,
    };

    if (!this.config.apiKey) {
      throw new Error('SilxarTracker: apiKey is required');
    }

    // Iniciar flush automático si batch está habilitado
    if (this.config.batch) {
      this.startFlushTimer();
    }

    // Flush antes de cerrar la página (browser only)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }

    this.log('Tracker initialized');
  }

  /**
   * Registra un evento
   */
  public track(eventName: string, data: EventData, options?: Omit<TrackOptions, 'data'>): void {
    const eventOptions: TrackOptions = {
      ...options,
      data,
    };

    if (this.config.batch) {
      this.enqueue(eventName, eventOptions);
    } else {
      this.sendImmediate(eventName, eventOptions);
    }
  }

  /**
   * Registra un evento de usuario registrado
   */
  public userRegistered(userId: string, email: string, extraData?: EventData): void {
    this.track('user_registered', {
      user_id: userId,
      email,
      ...extraData,
    }, { userId, email });
  }

  /**
   * Registra un evento de login
   */
  public userLogin(userId: string, email: string, extraData?: EventData): void {
    this.track('user_login', {
      user_id: userId,
      email,
      ...extraData,
    }, { userId, email });
  }

  /**
   * Registra un evento de pago
   */
  public paymentDone(userId: string, amount: number, currency: string = 'EUR', extraData?: EventData): void {
    this.track('payment_done', {
      user_id: userId,
      amount,
      currency,
      ...extraData,
    }, { userId });
  }

  /**
   * Registra un evento de plan creado/suscrito
   */
  public planCreated(userId: string, planType: string, amount: number, extraData?: EventData): void {
    this.track('plan_created', {
      user_id: userId,
      plan_type: planType,
      amount,
      ...extraData,
    }, { userId });
  }

  /**
   * Registra un evento de mensaje enviado
   */
  public messageSent(userId: string, messageType: string, extraData?: EventData): void {
    this.track('message_sent', {
      user_id: userId,
      message_type: messageType,
      ...extraData,
    }, { userId });
  }

  /**
   * Registra un evento de función usada
   */
  public featureUsed(userId: string, featureName: string, extraData?: EventData): void {
    this.track('feature_used', {
      user_id: userId,
      feature_name: featureName,
      ...extraData,
    }, { userId });
  }

  /**
   * Envía los eventos pendientes inmediatamente
   */
  public async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) {
      return;
    }

    this.isFlushing = true;
    const events = [...this.queue];
    this.queue = [];

    this.log(`Flushing ${events.length} events`);

    try {
      if (events.length === 1) {
        // Enviar un solo evento
        await this.sendEvent(events[0]);
      } else {
        // Enviar en batch
        await this.sendBatch(events);
      }
    } catch (error) {
      // Re-encolar eventos fallidos si tienen reintentos disponibles
      const failedEvents = events.filter(e => e.retries < this.config.retries);
      failedEvents.forEach(e => {
        e.retries++;
        this.queue.unshift(e);
      });

      this.log('Flush failed, events requeued', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Destruye el tracker y limpia recursos
   */
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  /**
   * Obtiene el número de eventos pendientes
   */
  public getQueueSize(): number {
    return this.queue.length;
  }

  private enqueue(eventName: string, options: TrackOptions): void {
    this.queue.push({
      event: eventName,
      options,
      retries: 0,
    });

    // Flush inmediato si alcanzamos el tamaño del batch
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private async sendImmediate(eventName: string, options: TrackOptions): Promise<void> {
    const event = this.buildEvent(eventName, options);
    await this.httpPost(this.config.endpoint, event);
  }

  private async sendEvent(queuedEvent: QueuedEvent): Promise<void> {
    const event = this.buildEvent(queuedEvent.event, queuedEvent.options);
    await this.httpPost(this.config.endpoint, event);
  }

  private async sendBatch(events: QueuedEvent[]): Promise<void> {
    const batchEvents = events.map(e => this.buildEvent(e.event, e.options));
    await this.httpPost(`${this.config.endpoint}/batch`, { events: batchEvents });
  }

  private buildEvent(eventName: string, options: TrackOptions): TrackedEvent {
    const eventId = options.eventId || this.generateEventId(eventName, options.userId);

    return {
      event: eventName,
      crm_id: this.config.crmId || undefined,
      timestamp: options.timestamp || new Date().toISOString(),
      event_id: eventId,
      user_id: options.userId,
      email: options.email,
      session_id: options.sessionId,
      data: options.data || {},
    };
  }

  private async httpPost(url: string, body: any): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      this.log('Event sent successfully');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private generateEventId(eventName: string, userId?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${eventName}:${userId || 'anon'}:${timestamp}:${random}`;
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[SilxarTracker]', ...args);
    }
  }
}

// Exportar función de conveniencia para crear tracker
export function createTracker(config: TrackerConfig): SilxarTracker {
  return new SilxarTracker(config);
}

// Exportar por defecto
export default SilxarTracker;
