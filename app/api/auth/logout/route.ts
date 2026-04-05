import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Logout is purely client-side (clear localStorage).
    // This route exists as a hook for future server-side cleanup.
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Logout failed' },
      { status: 500 }
    );
  }
}
