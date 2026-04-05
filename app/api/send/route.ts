import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, peerType, accessHash, message, replyToMsgId } = await req.json();
    if (!session || !chatId || !peerType || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await sendMessage(session, chatId, peerType, accessHash || '0', message, replyToMsgId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('send error:', err);
    return NextResponse.json(
      { error: err.errorMessage || err.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
