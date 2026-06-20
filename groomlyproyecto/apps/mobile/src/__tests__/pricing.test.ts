import { priceForSize, computeServiceTotals } from '@groomly/shared';

describe('pricing utilities', () => {
  describe('priceForSize', () => {
    const basePrices = {
      s: 25,
      m: 35,
      l: 45,
      xl: 55,
    };

    it('returns base price for medium size', () => {
      expect(priceForSize(basePrices, 'm')).toBe(35);
    });

    it('returns base price for small size', () => {
      expect(priceForSize(basePrices, 's')).toBe(25);
    });

    it('returns base price for large size', () => {
      expect(priceForSize(basePrices, 'l')).toBe(45);
    });

    it('defaults to medium price for unknown size', () => {
      expect(priceForSize(basePrices, 'unknown' as any)).toBe(35);
    });
  });

  describe('computeServiceTotals', () => {
    it('computes total for single service', () => {
      const services = [{ price: 30, durationMinutes: 60 }];
      const result = computeServiceTotals(services);
      expect(result.totalPrice).toBe(30);
      expect(result.totalDuration).toBe(60);
    });

    it('computes total for multiple services', () => {
      const services = [
        { price: 30, durationMinutes: 60 },
        { price: 15, durationMinutes: 30 },
      ];
      const result = computeServiceTotals(services);
      expect(result.totalPrice).toBe(45);
      expect(result.totalDuration).toBe(90);
    });

    it('handles empty services array', () => {
      const result = computeServiceTotals([]);
      expect(result.totalPrice).toBe(0);
      expect(result.totalDuration).toBe(0);
    });
  });
});
