import { NextRequest, NextResponse } from 'next/server';
import { getMessages } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, peerType, accessHash, limit } = await req.json();
    if (!session || !chatId || !peerType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await getMessages(session, chatId, peerType, accessHash || '0', limit || 50);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('messages error:', err);
    return NextResponse.json(
      { error: err.errorMessage || err.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
