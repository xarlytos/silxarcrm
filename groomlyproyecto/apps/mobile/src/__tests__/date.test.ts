import { ymd, startOfMonth, endOfMonth, spanishDate } from '@groomly/shared';

describe('date utilities', () => {
  describe('ymd', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      expect(ymd(date)).toBe('2024-06-15');
    });

    it('pads single digit month and day', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(ymd(date)).toBe('2024-01-05');
    });
  });

  describe('startOfMonth', () => {
    it('returns first day of month', () => {
      const date = new Date(2024, 5, 15);
      const result = startOfMonth(date);
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(5);
    });
  });

  describe('endOfMonth', () => {
    it('returns last day of month', () => {
      const date = new Date(2024, 5, 15); // June
      const result = endOfMonth(date);
      expect(result.getDate()).toBe(30);
    });

    it('handles February in leap year', () => {
      const date = new Date(2024, 1, 15); // February 2024 (leap)
      const result = endOfMonth(date);
      expect(result.getDate()).toBe(29);
    });
  });
});
