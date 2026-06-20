import type { PetSize, Service, ServiceAddon } from '../types/api';

export function priceForSize(service: Service, size: PetSize | string): number {
  if (!service.variablePrice) return service.price;
  const map: Record<PetSize, number | null> = {
    xs: service.priceSmall,
    s: service.priceSmall,
    m: service.priceMedium,
    l: service.priceLarge,
    xl: service.priceXLarge,
  };
  return map[size as PetSize] ?? service.price;
}

export interface ServiceTotals {
  totalPrice: number;
  totalDurationMinutes: number;
}

export interface ServiceLineSelection {
  serviceId: string;
  addonId?: string;
}

export function computeServiceTotals(
  lines: ServiceLineSelection[],
  services: Service[],
  size: PetSize | string,
): ServiceTotals {
  let totalPrice = 0;
  let totalDurationMinutes = 0;
  for (const line of lines) {
    const service = services.find((s) => s.id === line.serviceId);
    if (!service) continue;
    totalPrice += priceForSize(service, size);
    totalDurationMinutes += service.durationMinutes;
    if (line.addonId) {
      const addon: ServiceAddon | undefined = service.addons?.find(
        (a) => a.id === line.addonId,
      );
      if (addon) {
        totalPrice += addon.price;
        totalDurationMinutes += addon.durationExtraMinutes;
      }
    }
  }
  return { totalPrice, totalDurationMinutes };
}
