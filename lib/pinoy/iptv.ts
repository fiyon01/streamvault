import { IPHTV_M3U_URL } from '@/lib/pinoy/sources';

export type PinoyChannel = {
  name: string;
  group?: string;
  logo?: string;
  url: string;
};

function readAttribute(line: string, attribute: string) {
  const match = line.match(new RegExp(`${attribute}="([^"]+)"`));
  return match?.[1];
}

export function parsePinoyM3U(content: string): PinoyChannel[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const channels: PinoyChannel[] = [];
  let pending: Omit<PinoyChannel, 'url'> | null = null;

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const [, namePart = 'Pinoy Channel'] = line.split(',');
      pending = {
        name: namePart.trim() || 'Pinoy Channel',
        group: readAttribute(line, 'group-title'),
        logo: readAttribute(line, 'tvg-logo'),
      };
      continue;
    }

    if (!line.startsWith('#') && /^https?:\/\//i.test(line)) {
      channels.push({
        ...(pending || { name: 'Pinoy Channel' }),
        url: line,
      });
      pending = null;
    }
  }

  return channels;
}

export async function getPinoyIptvChannels(limit = 48) {
  const response = await fetch(IPHTV_M3U_URL, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`IPHTV fetch failed: ${response.status}`);
  }

  const content = await response.text();
  return parsePinoyM3U(content).slice(0, limit);
}

