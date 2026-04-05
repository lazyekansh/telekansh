import { NextRequest, NextResponse } from 'next/server';
import { downloadAvatar } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { session, peerId, peerType, accessHash } = await req.json();
    if (!session || !peerId || !peerType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await downloadAvatar(session, peerId, peerType, accessHash || '0');
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('avatar error:', err);
    return NextResponse.json({ base64Data: null });
  }
}
