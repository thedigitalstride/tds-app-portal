import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, MetaTagAnalysis, Client } from '@tds/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const format = searchParams.get('format') || 'json';

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();

    const [analyses, client] = await Promise.all([
      MetaTagAnalysis.find({ clientId }).sort({ analyzedAt: -1 }).lean(),
      Client.findById(clientId).lean(),
    ]);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'URL',
        'Title',
        'Title Length',
        'Description',
        'Description Length',
        'Canonical',
        'OG Title',
        'OG Description',
        'OG Image',
        'Twitter Card',
        'Score',
        'Errors',
        'Warnings',
        'Planned Title',
        'Planned Description',
        'Analyzed At',
      ];

      const rows = analyses.map((a) => [
        a.url,
        `"${(a.title || '').replace(/"/g, '""')}"`,
        a.title?.length || 0,
        `"${(a.description || '').replace(/"/g, '""')}"`,
        a.description?.length || 0,
        a.canonical || '',
        `"${(a.openGraph?.title || '').replace(/"/g, '""')}"`,
        `"${(a.openGraph?.description || '').replace(/"/g, '""')}"`,
        a.openGraph?.image || '',
        a.twitter?.card || '',
        a.score,
        a.issues?.filter((i) => i.type === 'error').length || 0,
        a.issues?.filter((i) => i.type === 'warning').length || 0,
        `"${(a.plannedTitle || '').replace(/"/g, '""')}"`,
        `"${(a.plannedDescription || '').replace(/"/g, '""')}"`,
        new Date(a.analyzedAt).toISOString(),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${client.name.replace(/[^a-z0-9]/gi, '-')}-meta-tags-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON format
    const exportData = {
      client: {
        name: client.name,
        website: client.website,
      },
      exportedAt: new Date().toISOString(),
      totalAnalyses: analyses.length,
      averageScore: analyses.length > 0
        ? Math.round(analyses.reduce((sum, a) => sum + (a.score || 0), 0) / analyses.length)
        : 0,
      analyses: analyses.map((a) => ({
        url: a.url,
        title: a.title,
        titleLength: a.title?.length || 0,
        description: a.description,
        descriptionLength: a.description?.length || 0,
        canonical: a.canonical,
        openGraph: a.openGraph,
        twitter: a.twitter,
        score: a.score,
        issues: a.issues,
        plannedTitle: a.plannedTitle,
        plannedDescription: a.plannedDescription,
        analyzedAt: a.analyzedAt,
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${client.name.replace(/[^a-z0-9]/gi, '-')}-meta-tags-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export analyses' },
      { status: 500 }
    );
  }
}
