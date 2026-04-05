import { NextRequest, NextResponse } from 'next/server';
import { downloadMedia } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, peerType, accessHash, messageId } = await req.json();
    
    if (!session || !chatId || !peerType || !messageId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { base64Data, mimeType } = await downloadMedia(
      session,
      chatId,
      peerType,
      accessHash || '0',
      messageId
    );

    return NextResponse.json({
      data: `data:${mimeType};base64,${base64Data}`,
      mimeType
    });

  } catch (err: any) {
    console.error('Download media error:', err);
    return NextResponse.json(
      { error: err.errorMessage || err.message || 'Failed to download media' },
      { status: 500 }
    );
  }
}
