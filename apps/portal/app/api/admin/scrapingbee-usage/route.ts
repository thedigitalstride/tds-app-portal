import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PageSnapshot } from '@tds/database';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

interface SummaryStats {
  allTime: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
}

interface ProxyTierStats {
  standard: number;
  premium: number;
  stealth: number;
}

interface ClientStats {
  clientId: string;
  clientName: string;
  creditsUsed: number;
}

interface ToolStats {
  toolId: string;
  creditsUsed: number;
}

interface DailyTrend {
  date: string;
  creditsUsed: number;
}

interface StatsResponse {
  summary: SummaryStats;
  byProxyTier: ProxyTierStats;
  byClient: ClientStats[];
  byTool: ToolStats[];
  dailyTrend: DailyTrend[];
}

interface LogEntry {
  _id: string;
  fetchedAt: string;
  url: string;
  clientName: string;
  triggeredByTool: string;
  proxyTierUsed: string;
  scrapingBeeCreditsUsed: number;
  renderTimeMs?: number;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'stats';

    if (view === 'stats') {
      return NextResponse.json(await getStats());
    } else if (view === 'logs') {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const clientId = searchParams.get('clientId');
      const toolId = searchParams.get('toolId');
      const proxyTier = searchParams.get('proxyTier');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      return NextResponse.json(
        await getLogs({ page, limit, clientId, toolId, proxyTier, startDate, endDate })
      );
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
  } catch (error) {
    console.error('Failed to fetch ScrapingBee usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ScrapingBee usage' },
      { status: 500 }
    );
  }
}

async function getStats(): Promise<StatsResponse> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get summary stats using facets
  const summaryResult = await PageSnapshot.aggregate([
    { $match: { renderMethod: 'scrapingbee' } },
    {
      $facet: {
        allTime: [
          { $group: { _id: null, total: { $sum: '$scrapingBeeCreditsUsed' } } },
        ],
        thisMonth: [
          { $match: { fetchedAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$scrapingBeeCreditsUsed' } } },
        ],
        thisWeek: [
          { $match: { fetchedAt: { $gte: startOfWeek } } },
          { $group: { _id: null, total: { $sum: '$scrapingBeeCreditsUsed' } } },
        ],
        today: [
          { $match: { fetchedAt: { $gte: startOfToday } } },
          { $group: { _id: null, total: { $sum: '$scrapingBeeCreditsUsed' } } },
        ],
      },
    },
  ]);

  const summaryData = summaryResult[0];
  const summary: SummaryStats = {
    allTime: summaryData?.allTime?.[0]?.total || 0,
    thisMonth: summaryData?.thisMonth?.[0]?.total || 0,
    thisWeek: summaryData?.thisWeek?.[0]?.total || 0,
    today: summaryData?.today?.[0]?.total || 0,
  };

  // Get usage by proxy tier
  const proxyTierResult = await PageSnapshot.aggregate([
    { $match: { renderMethod: 'scrapingbee' } },
    {
      $group: {
        _id: '$proxyTierUsed',
        credits: { $sum: '$scrapingBeeCreditsUsed' },
      },
    },
  ]);

  const byProxyTier: ProxyTierStats = {
    standard: 0,
    premium: 0,
    stealth: 0,
  };
  for (const item of proxyTierResult) {
    const tier = item._id as string;
    if (tier === 'standard' || tier === 'premium' || tier === 'stealth') {
      byProxyTier[tier] = item.credits || 0;
    }
  }

  // Get usage by client (top 10)
  const clientResult = await PageSnapshot.aggregate([
    { $match: { renderMethod: 'scrapingbee' } },
    {
      $group: {
        _id: '$triggeredByClient',
        credits: { $sum: '$scrapingBeeCreditsUsed' },
      },
    },
    { $sort: { credits: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'clients',
        localField: '_id',
        foreignField: '_id',
        as: 'client',
      },
    },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
  ]);

  const byClient: ClientStats[] = clientResult.map((item) => ({
    clientId: item._id?.toString() || 'unknown',
    clientName: item.client?.name || 'Unknown Client',
    creditsUsed: item.credits || 0,
  }));

  // Get usage by tool
  const toolResult = await PageSnapshot.aggregate([
    { $match: { renderMethod: 'scrapingbee' } },
    {
      $group: {
        _id: '$triggeredByTool',
        credits: { $sum: '$scrapingBeeCreditsUsed' },
      },
    },
    { $sort: { credits: -1 } },
  ]);

  const byTool: ToolStats[] = toolResult.map((item) => ({
    toolId: item._id || 'unknown',
    creditsUsed: item.credits || 0,
  }));

  // Get daily trend (last 30 days)
  const dailyResult = await PageSnapshot.aggregate([
    {
      $match: {
        renderMethod: 'scrapingbee',
        fetchedAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$fetchedAt' },
        },
        credits: { $sum: '$scrapingBeeCreditsUsed' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill in missing days with 0
  const dailyTrend: DailyTrend[] = [];
  const dailyMap = new Map<string, number>();
  for (const item of dailyResult) {
    dailyMap.set(item._id, item.credits);
  }

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyTrend.push({
      date: dateStr,
      creditsUsed: dailyMap.get(dateStr) || 0,
    });
  }

  return {
    summary,
    byProxyTier,
    byClient,
    byTool,
    dailyTrend,
  };
}

async function getLogs(params: {
  page: number;
  limit: number;
  clientId: string | null;
  toolId: string | null;
  proxyTier: string | null;
  startDate: string | null;
  endDate: string | null;
}): Promise<LogsResponse> {
  const { page, limit, clientId, toolId, proxyTier, startDate, endDate } = params;

  // Build match conditions
  const matchConditions: Record<string, unknown> = {
    renderMethod: 'scrapingbee',
  };

  if (clientId) {
    matchConditions.triggeredByClient = new mongoose.Types.ObjectId(clientId);
  }
  if (toolId) {
    matchConditions.triggeredByTool = toolId;
  }
  if (proxyTier) {
    matchConditions.proxyTierUsed = proxyTier;
  }
  if (startDate || endDate) {
    matchConditions.fetchedAt = {};
    if (startDate) {
      (matchConditions.fetchedAt as Record<string, Date>).$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1); // Include the entire end date
      (matchConditions.fetchedAt as Record<string, Date>).$lt = end;
    }
  }

  // Get total count
  const total = await PageSnapshot.countDocuments(matchConditions);

  // Get paginated logs with client lookup
  const logs = await PageSnapshot.aggregate([
    { $match: matchConditions },
    { $sort: { fetchedAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $lookup: {
        from: 'clients',
        localField: 'triggeredByClient',
        foreignField: '_id',
        as: 'client',
      },
    },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        fetchedAt: 1,
        url: 1,
        clientName: { $ifNull: ['$client.name', 'Unknown Client'] },
        triggeredByTool: 1,
        proxyTierUsed: 1,
        scrapingBeeCreditsUsed: 1,
        renderTimeMs: 1,
      },
    },
  ]);

  return {
    logs: logs.map((log) => ({
      _id: log._id.toString(),
      fetchedAt: log.fetchedAt.toISOString(),
      url: log.url,
      clientName: log.clientName,
      triggeredByTool: log.triggeredByTool,
      proxyTierUsed: log.proxyTierUsed || 'standard',
      scrapingBeeCreditsUsed: log.scrapingBeeCreditsUsed || 0,
      renderTimeMs: log.renderTimeMs,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
