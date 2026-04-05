import { NextRequest, NextResponse } from 'next/server';
import { getDialogs } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { session, limit } = await req.json();
    if (!session) {
      return NextResponse.json({ error: 'Session is required' }, { status: 400 });
    }
    const result = await getDialogs(session, limit || 40);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('dialogs error:', err);
    return NextResponse.json(
      { error: err.errorMessage || err.message || 'Failed to fetch dialogs' },
      { status: 500 }
    );
  }
}
