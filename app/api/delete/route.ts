import { NextRequest, NextResponse } from 'next/server';
import { deleteMessages } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, peerType, accessHash, messageIds, revoke } = await req.json();
    if (!session || !chatId || !peerType || !messageIds?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await deleteMessages(session, chatId, peerType, accessHash || '0', messageIds, revoke ?? true);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('delete error:', err);
    return NextResponse.json(
      { error: err.errorMessage || err.message || 'Failed to delete message' },
      { status: 500 }
    );
  }
}
