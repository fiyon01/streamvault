import { NextResponse } from 'next/server';
import { getPinoyIptvChannels } from '@/lib/pinoy/iptv';
import { IPHTV_M3U_URL } from '@/lib/pinoy/sources';

export async function GET() {
  try {
    const channels = await getPinoyIptvChannels(48);
    return NextResponse.json({
      channels,
      source: 'IPHTV',
      sourceUrl: IPHTV_M3U_URL,
    });
  } catch (error) {
    console.error('Pinoy live channel load failed', error);
    return NextResponse.json({
      channels: [],
      source: 'IPHTV',
      sourceUrl: IPHTV_M3U_URL,
      error: 'Live channels are temporarily unavailable.',
    });
  }
}

