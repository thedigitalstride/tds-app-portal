import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, MetaTagAnalysis } from '@tds/database';

export const dynamic = 'force-dynamic';

interface ToolUsageData {
  toolId: string;
  count: number;
  lastUsed: string;
}

interface ClientToolUsage {
  [clientId: string]: {
    tools: ToolUsageData[];
  };
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Aggregate meta tag analyses by clientId
    const metaTagUsage = await MetaTagAnalysis.aggregate([
      {
        $group: {
          _id: '$clientId',
          count: { $sum: 1 },
          lastUsed: { $max: '$lastScannedAt' },
        },
      },
    ]);

    // Transform into the response structure
    const toolUsage: ClientToolUsage = {};

    for (const item of metaTagUsage) {
      const clientId = item._id.toString();
      toolUsage[clientId] = {
        tools: [
          {
            toolId: 'meta-tag-analyser',
            count: item.count,
            lastUsed: item.lastUsed?.toISOString() || new Date().toISOString(),
          },
        ],
      };
    }

    return NextResponse.json(toolUsage);
  } catch (error) {
    console.error('Failed to fetch tool usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool usage' },
      { status: 500 }
    );
  }
}
