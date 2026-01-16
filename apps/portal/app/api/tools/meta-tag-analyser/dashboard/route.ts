import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, MetaTagAnalysis, Client } from '@tds/database';

export const dynamic = 'force-dynamic';

// GET - Fetch dashboard data: all scans grouped by client
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get all clients
    const clients = await Client.find({ isActive: true }).lean();

    // Get analyses with aggregation for each client
    const dashboardData = await Promise.all(
      clients.map(async (client) => {
        const analyses = await MetaTagAnalysis.find({ clientId: client._id })
          .sort({ lastScannedAt: -1, analyzedAt: -1 })
          .populate('analyzedBy', 'name email')
          .populate('lastScannedBy', 'name email')
          .lean();

        // Calculate stats
        const totalScans = analyses.length;
        const totalScanRuns = analyses.reduce((acc, a) => acc + (a.scanCount || 1), 0);
        const averageScore = totalScans > 0
          ? Math.round(analyses.reduce((acc, a) => acc + a.score, 0) / totalScans)
          : 0;
        const lastScan = analyses[0];
        const errorCount = analyses.reduce((acc, a) =>
          acc + (a.issues?.filter((i: { type: string }) => i.type === 'error').length || 0), 0);
        const warningCount = analyses.reduce((acc, a) =>
          acc + (a.issues?.filter((i: { type: string }) => i.type === 'warning').length || 0), 0);

        return {
          client: {
            _id: client._id,
            name: client.name,
            website: client.website,
          },
          stats: {
            totalUrls: totalScans,
            totalScanRuns,
            averageScore,
            errorCount,
            warningCount,
            lastScanDate: lastScan?.lastScannedAt || lastScan?.analyzedAt || null,
            lastScannedBy: lastScan?.lastScannedBy || lastScan?.analyzedBy || null,
          },
          recentScans: analyses.slice(0, 5).map(a => ({
            _id: a._id,
            url: a.url,
            title: a.title,
            score: a.score,
            scanCount: a.scanCount || 1,
            analyzedAt: a.analyzedAt,
            lastScannedAt: a.lastScannedAt || a.analyzedAt,
            lastScannedBy: a.lastScannedBy || a.analyzedBy,
            issueCount: {
              errors: a.issues?.filter((i: { type: string }) => i.type === 'error').length || 0,
              warnings: a.issues?.filter((i: { type: string }) => i.type === 'warning').length || 0,
            },
          })),
        };
      })
    );

    // Filter out clients with no scans and sort by last scan date
    const filteredData = dashboardData
      .filter(d => d.stats.totalUrls > 0)
      .sort((a, b) => {
        const dateA = a.stats.lastScanDate ? new Date(a.stats.lastScanDate).getTime() : 0;
        const dateB = b.stats.lastScanDate ? new Date(b.stats.lastScanDate).getTime() : 0;
        return dateB - dateA;
      });

    // Global stats
    const globalStats = {
      totalClients: filteredData.length,
      totalUrls: filteredData.reduce((acc, d) => acc + d.stats.totalUrls, 0),
      totalScans: filteredData.reduce((acc, d) => acc + d.stats.totalScanRuns, 0),
      averageScore: filteredData.length > 0
        ? Math.round(filteredData.reduce((acc, d) => acc + d.stats.averageScore, 0) / filteredData.length)
        : 0,
      totalErrors: filteredData.reduce((acc, d) => acc + d.stats.errorCount, 0),
      totalWarnings: filteredData.reduce((acc, d) => acc + d.stats.warningCount, 0),
    };

    return NextResponse.json({
      globalStats,
      clientData: filteredData,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
