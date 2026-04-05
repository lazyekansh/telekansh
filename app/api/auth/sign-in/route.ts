import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { session, phone, phoneCodeHash, code } = await req.json();
    if (!session || !phone || !phoneCodeHash || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await signIn(session, phone, phoneCodeHash, code);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('sign-in error:', err);
    return NextResponse.json(
      { error: err.errorMessage || err.message || 'Sign in failed' },
      { status: 500 }
    );
  }
}
