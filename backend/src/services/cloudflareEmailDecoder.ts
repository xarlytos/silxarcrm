import * as cheerio from 'cheerio';

export function decodeCfEmail(hex: string): string | null {
  if (!hex || hex.length < 4 || hex.length % 2 !== 0) return null;
  try {
    const key = parseInt(hex.substring(0, 2), 16);
    let out = '';
    for (let i = 2; i < hex.length; i += 2) {
      const byte = parseInt(hex.substring(i, i + 2), 16) ^ key;
      out += String.fromCharCode(byte);
    }
    return out;
  } catch {
    return null;
  }
}

export function extractCloudflareEmails($: cheerio.CheerioAPI): string[] {
  const emails: string[] = [];

  $('a.__cf_email__, span.__cf_email__, .__cf_email__').each((_, el) => {
    const hex = $(el).attr('data-cfemail');
    if (!hex) return;
    const decoded = decodeCfEmail(hex);
    if (decoded) emails.push(decoded);
  });

  $('a[href*="/cdn-cgi/l/email-protection"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(/#([a-fA-F0-9]+)/);
    if (m) {
      const decoded = decodeCfEmail(m[1]);
      if (decoded) emails.push(decoded);
    }
  });

  return emails;
}
