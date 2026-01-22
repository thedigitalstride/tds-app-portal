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
      // Generate CSV with extended fields
      const headers = [
        'URL',
        'Title',
        'Title Length',
        'Description',
        'Description Length',
        'Canonical',
        'Robots',
        'Viewport',
        'Language',
        // Open Graph
        'OG Title',
        'OG Description',
        'OG Image',
        'OG Image Alt',
        'OG Locale',
        'OG Type',
        // Twitter
        'Twitter Card',
        'Twitter Site',
        'Twitter Creator',
        'Twitter Image Alt',
        // Structured Data
        'Has JSON-LD',
        'JSON-LD Valid',
        'Schema Types',
        // Technical SEO
        'Robots Index',
        'Robots Follow',
        'Keywords',
        // Site Verification
        'Google Verification',
        'Bing Verification',
        // Mobile/PWA
        'Has Manifest',
        'Apple Web App',
        // Security
        'Referrer Policy',
        // Image Validation
        'OG Image Valid',
        'Twitter Image Valid',
        // Score & Issues
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
        a.robots || '',
        a.viewport || '',
        a.language || '',
        // Open Graph
        `"${(a.openGraph?.title || '').replace(/"/g, '""')}"`,
        `"${(a.openGraph?.description || '').replace(/"/g, '""')}"`,
        a.openGraph?.image || '',
        a.openGraph?.imageDetails?.alt || '',
        a.openGraph?.locale || '',
        a.openGraph?.type || '',
        // Twitter
        a.twitter?.card || '',
        a.twitter?.site || '',
        a.twitter?.creator || '',
        a.twitter?.imageAlt || '',
        // Structured Data
        a.structuredData?.found ? 'Yes' : 'No',
        a.structuredData?.isValidJson ? 'Yes' : 'No',
        `"${(a.structuredData?.types || []).join(', ')}"`,
        // Technical SEO
        a.technicalSeo?.robotsDirectives?.index !== undefined
          ? (a.technicalSeo.robotsDirectives.index ? 'Yes' : 'No')
          : '',
        a.technicalSeo?.robotsDirectives?.follow !== undefined
          ? (a.technicalSeo.robotsDirectives.follow ? 'Yes' : 'No')
          : '',
        `"${(a.technicalSeo?.keywords || '').replace(/"/g, '""')}"`,
        // Site Verification
        a.siteVerification?.google ? 'Yes' : 'No',
        a.siteVerification?.bing ? 'Yes' : 'No',
        // Mobile/PWA
        a.mobile?.manifest ? 'Yes' : 'No',
        a.mobile?.appleWebAppCapable || '',
        // Security
        a.security?.referrerPolicy || '',
        // Image Validation
        a.imageValidation?.ogImage?.exists !== undefined
          ? (a.imageValidation.ogImage.exists ? 'Yes' : 'No')
          : '',
        a.imageValidation?.twitterImage?.exists !== undefined
          ? (a.imageValidation.twitterImage.exists ? 'Yes' : 'No')
          : '',
        // Score & Issues
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

    // JSON format - includes all fields
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
        robots: a.robots,
        viewport: a.viewport,
        charset: a.charset,
        author: a.author,
        themeColor: a.themeColor,
        language: a.language,
        favicon: a.favicon,
        hreflang: a.hreflang,
        openGraph: a.openGraph,
        twitter: a.twitter,
        structuredData: a.structuredData,
        technicalSeo: a.technicalSeo,
        siteVerification: a.siteVerification,
        mobile: a.mobile,
        security: a.security,
        imageValidation: a.imageValidation,
        score: a.score,
        issues: a.issues,
        plannedTitle: a.plannedTitle,
        plannedDescription: a.plannedDescription,
        analyzedAt: a.analyzedAt,
        scanCount: a.scanCount,
        lastScannedAt: a.lastScannedAt,
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
