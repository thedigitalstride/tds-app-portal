import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from '@/lib/auth';
import { connectDB, ApiDataRow, ApiFetchLog, buildMetaCompositeKey } from '@tds/database';
import { fetchInsights } from '../lib/meta-client';
import { getPresetById } from '../lib/presets';
import type { MetaFetchRequest, MetaInsightsQuery } from '../lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tools/data-flow/meta/fetch
 * Fetch insights from Meta API, upsert into ApiDataRow, log the fetch.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = (await request.json()) as MetaFetchRequest;
    const {
      clientId, accountId, accountName, preset, datePreset, customDateRange,
      query: customQuery, customFields, customBreakdowns, level, timeIncrement,
    } = body;

    if (!clientId || !accountId) {
      return NextResponse.json({ error: 'clientId and accountId are required' }, { status: 400 });
    }

    // Build the query from preset or custom params
    let query: MetaInsightsQuery;

    if (customQuery) {
      query = customQuery;
    } else if (preset && preset !== 'custom') {
      const presetDef = getPresetById(preset);
      if (!presetDef) {
        return NextResponse.json({ error: `Unknown preset: ${preset}` }, { status: 400 });
      }

      query = {
        accountId,
        fields: presetDef.fields,
        breakdowns: presetDef.breakdowns,
        level: presetDef.level,
        timeIncrement: presetDef.timeIncrement,
      };

      if (customDateRange) {
        query.timeRange = customDateRange;
      } else {
        query.datePreset = datePreset ?? 'last_30d';
      }
    } else if (preset === 'custom' && customFields?.length) {
      // Build query from advanced custom options
      query = {
        accountId,
        fields: customFields,
        breakdowns: customBreakdowns?.length ? customBreakdowns : undefined,
        level: level ?? 'campaign',
        timeIncrement: timeIncrement ?? undefined,
      };

      if (customDateRange) {
        query.timeRange = customDateRange;
      } else {
        query.datePreset = datePreset ?? 'last_30d';
      }
    } else {
      return NextResponse.json({ error: 'Either preset or query is required' }, { status: 400 });
    }

    // Ensure accountId is set on the query
    query.accountId = accountId;

    // Fetch from Meta API
    const { rows, fields } = await fetchInsights(query);

    await connectDB();

    // Create fetch log entry
    const fetchLog = await ApiFetchLog.create({
      clientId,
      sourceType: 'meta-ads',
      sourceAccountId: accountId,
      queryParams: query,
      rowCount: rows.length,
      upsertedCount: 0,
      durationMs: 0,
      status: 'success',
      fetchedBy: session.user.id,
    });

    // Upsert rows into ApiDataRow
    const breakdownKeys = query.breakdowns ?? [];

    if (rows.length > 0) {
      const clientObjectId = new mongoose.Types.ObjectId(clientId);

      const bulkOps = rows.map((row) => {
        const compositeKey = buildMetaCompositeKey(row, breakdownKeys);

        return {
          updateOne: {
            filter: {
              clientId: clientObjectId,
              sourceType: 'meta-ads' as const,
              compositeKey,
            },
            update: {
              $set: {
                sourceAccountId: accountId,
                sourceAccountName: accountName,
                data: row,
                entityLevel: query.level,
                entityId: String(row.campaign_id ?? row.adset_id ?? row.ad_id ?? ''),
                entityName: String(row.campaign_name ?? row.adset_name ?? row.ad_name ?? ''),
                dateStart: new Date(String(row.date_start)),
                dateStop: new Date(String(row.date_stop)),
                breakdowns: breakdownKeys.length > 0
                  ? Object.fromEntries(breakdownKeys.map((k) => [k, row[k]]))
                  : undefined,
                fetchId: fetchLog._id,
              },
            },
            upsert: true,
          },
        };
      });

      const bulkResult = await ApiDataRow.bulkWrite(bulkOps);
      const upsertedCount = (bulkResult.upsertedCount ?? 0) + (bulkResult.modifiedCount ?? 0);

      // Update fetch log with upsert count and duration
      await ApiFetchLog.findByIdAndUpdate(fetchLog._id, {
        upsertedCount,
        durationMs: Date.now() - startTime,
      });
    } else {
      await ApiFetchLog.findByIdAndUpdate(fetchLog._id, {
        durationMs: Date.now() - startTime,
      });
    }

    return NextResponse.json({
      success: true,
      fetchId: fetchLog._id.toString(),
      rowCount: rows.length,
      rows,
      fields,
    });
  } catch (error) {
    console.error('Error fetching Meta insights:', error);

    // Try to log the error
    try {
      const body = await request.clone().json().catch(() => ({})) as Partial<MetaFetchRequest>;
      if (body.clientId && body.accountId) {
        await connectDB();
        await ApiFetchLog.create({
          clientId: body.clientId,
          sourceType: 'meta-ads',
          sourceAccountId: body.accountId,
          queryParams: {},
          rowCount: 0,
          upsertedCount: 0,
          durationMs: Date.now() - startTime,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          fetchedBy: 'system',
        });
      }
    } catch {
      // Ignore logging errors
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
