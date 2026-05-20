import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export type PhoneType = 'mobile' | 'fixed' | 'unknown';

const DEFAULT_COUNTRY: CountryCode = 'ES';

export function detectPhoneType(raw: string | null | undefined, defaultCountry: CountryCode = DEFAULT_COUNTRY): PhoneType {
  if (!raw?.trim()) return 'unknown';
  try {
    const parsed = parsePhoneNumberFromString(raw, defaultCountry);
    if (!parsed || !parsed.isValid()) return 'unknown';
    const t = parsed.getType();
    if (t === 'MOBILE') return 'mobile';
    if (t === 'FIXED_LINE') return 'fixed';
    // FIXED_LINE_OR_MOBILE, PERSONAL_NUMBER, undefined, etc. → no podemos garantizar móvil
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function canHaveWhatsapp(raw: string | null | undefined): boolean {
  return detectPhoneType(raw) !== 'fixed';
}
