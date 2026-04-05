import { NextRequest, NextResponse } from 'next/server';
import { editMessage } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, peerType, accessHash, messageId, text } = await req.json();
    if (!session || !chatId || !peerType || !messageId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await editMessage(session, chatId, peerType, accessHash || '0', messageId, text);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('edit error:', err);
    return NextResponse.json(
      { error: err.errorMessage || err.message || 'Failed to edit message' },
      { status: 500 }
    );
  }
}
