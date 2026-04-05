import { NextRequest, NextResponse } from 'next/server';
import { sendCode } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    const result = await sendCode(phone);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('send-code error:', err);
    return NextResponse.json(
      { error: err.errorMessage || err.message || 'Failed to send code' },
      { status: 500 }
    );
  }
}
