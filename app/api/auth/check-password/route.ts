import { NextRequest, NextResponse } from 'next/server';
import { checkPassword } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { session, password } = await req.json();
    if (!session || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await checkPassword(session, password);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('check-password error:', err);
    return NextResponse.json(
      { error: err.errorMessage || err.message || 'Password check failed' },
      { status: 500 }
    );
  }
}
