import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDomainConfigs,
  setDomainConfig,
  deleteDomainConfig,
} from '@/lib/services/page-store-service';

/**
 * GET /api/cookie-domain-config?clientId=xxx
 * Get all domain configs for a client
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
  }

  try {
    const configs = await getDomainConfigs(clientId);
    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Failed to get domain configs:', error);
    return NextResponse.json(
      { error: 'Failed to get domain configs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cookie-domain-config
 * Create or update a domain config
 * Body: { clientId, domain, cookieConsentProvider }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { clientId, domain, cookieConsentProvider } = await request.json();

    if (!clientId || !domain || !cookieConsentProvider) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, domain, cookieConsentProvider' },
        { status: 400 }
      );
    }

    // Validate provider
    if (!['none', 'cookiebot'].includes(cookieConsentProvider)) {
      return NextResponse.json(
        { error: 'Invalid cookieConsentProvider. Must be "none" or "cookiebot"' },
        { status: 400 }
      );
    }

    const config = await setDomainConfig(domain, clientId, cookieConsentProvider);
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Failed to set domain config:', error);
    return NextResponse.json(
      { error: 'Failed to set domain config' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cookie-domain-config
 * Delete a domain config
 * Body: { clientId, domain }
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { clientId, domain } = await request.json();

    if (!clientId || !domain) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, domain' },
        { status: 400 }
      );
    }

    const deleted = await deleteDomainConfig(domain, clientId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Domain config not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete domain config:', error);
    return NextResponse.json(
      { error: 'Failed to delete domain config' },
      { status: 500 }
    );
  }
}
