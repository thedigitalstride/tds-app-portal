import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, AiUsageLog } from '@tds/database';
import { getUsdToGbpRate } from '@/lib/ai/ai-usage-logger';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Stats types
// ---------------------------------------------------------------------------

interface SummaryStats {
  allTime: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
  allTimeTokens: number;
  thisMonthTokens: number;
  thisWeekTokens: number;
  todayTokens: number;
}

interface ToolStats {
  toolId: string;
  totalCost: number;
  totalTokens: number;
}

interface UserStats {
  userId: string;
  userName: string;
  userEmail: string;
  totalCost: number;
  totalTokens: number;
}

interface ClientStats {
  clientId: string;
  clientName: string;
  totalCost: number;
  totalTokens: number;
}

interface ModelStats {
  aiModel: string;
  provider: string;
  totalCost: number;
  totalTokens: number;
}

interface DailyTrend {
  date: string;
  totalCost: number;
}

interface StatsResponse {
  summary: SummaryStats;
  byTool: ToolStats[];
  byUser: UserStats[];
  byClient: ClientStats[];
  byModel: ModelStats[];
  dailyTrend: DailyTrend[];
  exchangeRate: number;
}

// ---------------------------------------------------------------------------
// Logs types
// ---------------------------------------------------------------------------

interface LogEntry {
  _id: string;
  createdAt: string;
  toolId: string;
  userName: string;
  clientName: string;
  purpose: string;
  provider: string;
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  exchangeRate: number;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

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
      const toolId = searchParams.get('toolId');
      const userId = searchParams.get('userId');
      const clientId = searchParams.get('clientId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      return NextResponse.json(
        await getLogs({ page, limit, toolId, userId, clientId, startDate, endDate })
      );
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
  } catch (error) {
    console.error('Failed to fetch AI costs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI costs' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

async function getStats(): Promise<StatsResponse> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Summary stats using $facet
  const summaryResult = await AiUsageLog.aggregate([
    {
      $facet: {
        allTime: [
          {
            $group: {
              _id: null,
              totalCost: { $sum: '$totalCost' },
              totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
            },
          },
        ],
        thisMonth: [
          { $match: { createdAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              totalCost: { $sum: '$totalCost' },
              totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
            },
          },
        ],
        thisWeek: [
          { $match: { createdAt: { $gte: startOfWeek } } },
          {
            $group: {
              _id: null,
              totalCost: { $sum: '$totalCost' },
              totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
            },
          },
        ],
        today: [
          { $match: { createdAt: { $gte: startOfToday } } },
          {
            $group: {
              _id: null,
              totalCost: { $sum: '$totalCost' },
              totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
            },
          },
        ],
      },
    },
  ]);

  const summaryData = summaryResult[0];
  const summary: SummaryStats = {
    allTime: summaryData?.allTime?.[0]?.totalCost || 0,
    thisMonth: summaryData?.thisMonth?.[0]?.totalCost || 0,
    thisWeek: summaryData?.thisWeek?.[0]?.totalCost || 0,
    today: summaryData?.today?.[0]?.totalCost || 0,
    allTimeTokens: summaryData?.allTime?.[0]?.totalTokens || 0,
    thisMonthTokens: summaryData?.thisMonth?.[0]?.totalTokens || 0,
    thisWeekTokens: summaryData?.thisWeek?.[0]?.totalTokens || 0,
    todayTokens: summaryData?.today?.[0]?.totalTokens || 0,
  };

  // By tool
  const toolResult = await AiUsageLog.aggregate([
    {
      $group: {
        _id: '$toolId',
        totalCost: { $sum: '$totalCost' },
        totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
      },
    },
    { $sort: { totalCost: -1 } },
  ]);

  const byTool: ToolStats[] = toolResult.map((item) => ({
    toolId: item._id || 'unknown',
    totalCost: item.totalCost || 0,
    totalTokens: item.totalTokens || 0,
  }));

  // By user (top 10) with lookup
  const userResult = await AiUsageLog.aggregate([
    {
      $group: {
        _id: '$userId',
        totalCost: { $sum: '$totalCost' },
        totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
      },
    },
    { $sort: { totalCost: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  ]);

  const byUser: UserStats[] = userResult.map((item) => ({
    userId: item._id?.toString() || 'unknown',
    userName: item.user?.name || 'Unknown User',
    userEmail: item.user?.email || '',
    totalCost: item.totalCost || 0,
    totalTokens: item.totalTokens || 0,
  }));

  // By client (top 10, exclude null clientId) with lookup
  const clientResult = await AiUsageLog.aggregate([
    { $match: { clientId: { $ne: null } } },
    {
      $group: {
        _id: '$clientId',
        totalCost: { $sum: '$totalCost' },
        totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
      },
    },
    { $sort: { totalCost: -1 } },
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
    totalCost: item.totalCost || 0,
    totalTokens: item.totalTokens || 0,
  }));

  // By model
  const modelResult = await AiUsageLog.aggregate([
    {
      $group: {
        _id: { aiModel: '$aiModel', provider: '$provider' },
        totalCost: { $sum: '$totalCost' },
        totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
      },
    },
    { $sort: { totalCost: -1 } },
  ]);

  const byModel: ModelStats[] = modelResult.map((item) => ({
    aiModel: item._id?.aiModel || 'unknown',
    provider: item._id?.provider || 'unknown',
    totalCost: item.totalCost || 0,
    totalTokens: item.totalTokens || 0,
  }));

  // Daily trend (last 30 days)
  const dailyResult = await AiUsageLog.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        totalCost: { $sum: '$totalCost' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill missing days with 0
  const dailyTrend: DailyTrend[] = [];
  const dailyMap = new Map<string, number>();
  for (const item of dailyResult) {
    dailyMap.set(item._id, item.totalCost);
  }

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyTrend.push({
      date: dateStr,
      totalCost: dailyMap.get(dateStr) || 0,
    });
  }

  const exchangeRate = await getUsdToGbpRate();

  return {
    summary,
    byTool,
    byUser,
    byClient,
    byModel,
    dailyTrend,
    exchangeRate,
  };
}

// ---------------------------------------------------------------------------
// getLogs
// ---------------------------------------------------------------------------

async function getLogs(params: {
  page: number;
  limit: number;
  toolId: string | null;
  userId: string | null;
  clientId: string | null;
  startDate: string | null;
  endDate: string | null;
}): Promise<LogsResponse> {
  const { page, limit, toolId, userId, clientId, startDate, endDate } = params;

  // Build match conditions
  const matchConditions: Record<string, unknown> = {};

  if (toolId) {
    matchConditions.toolId = toolId;
  }
  if (userId) {
    matchConditions.userId = new mongoose.Types.ObjectId(userId);
  }
  if (clientId) {
    matchConditions.clientId = new mongoose.Types.ObjectId(clientId);
  }
  if (startDate || endDate) {
    matchConditions.createdAt = {};
    if (startDate) {
      (matchConditions.createdAt as Record<string, Date>).$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1); // Include the entire end date
      (matchConditions.createdAt as Record<string, Date>).$lt = end;
    }
  }

  // Get total count
  const total = await AiUsageLog.countDocuments(matchConditions);

  // Get paginated logs with user and client lookups
  const logs = await AiUsageLog.aggregate([
    { $match: matchConditions },
    { $sort: { createdAt: -1 as const } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: 'client',
      },
    },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        createdAt: 1,
        toolId: 1,
        userName: { $ifNull: ['$user.name', 'Unknown User'] },
        clientName: { $ifNull: ['$client.name', 'N/A'] },
        purpose: 1,
        provider: 1,
        aiModel: 1,
        inputTokens: 1,
        outputTokens: 1,
        totalCost: 1,
      },
    },
  ]);

  const exchangeRate = await getUsdToGbpRate();

  return {
    logs: logs.map((log) => ({
      _id: log._id.toString(),
      createdAt: log.createdAt.toISOString(),
      toolId: log.toolId,
      userName: log.userName,
      clientName: log.clientName,
      purpose: log.purpose,
      provider: log.provider,
      aiModel: log.aiModel,
      inputTokens: log.inputTokens || 0,
      outputTokens: log.outputTokens || 0,
      totalCost: log.totalCost || 0,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    exchangeRate,
  };
}
