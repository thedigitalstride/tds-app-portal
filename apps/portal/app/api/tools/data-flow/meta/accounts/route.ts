import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { fetchAdAccounts } from '../lib/meta-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tools/data-flow/meta/accounts
 * List ad accounts accessible by the system user token.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const accounts = await fetchAdAccounts();
    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching Meta ad accounts:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
