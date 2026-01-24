import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdmin,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/permissions';
import {
  connectDB,
  PageSnapshot,
  PageStore,
  MetaTagAnalysis,
  PendingScan,
} from '@tds/database';
import { deletePageHtml } from '@/lib/vercel-blob';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 minutes for large cleanup

type CleanupTarget = 'page-library' | 'meta-tag-analyser' | 'all';

interface CleanupResult {
  pageSnapshots: number;
  pageStores: number;
  metaTagAnalyses: number;
  pendingScans: number;
  blobsDeleted: number;
  blobErrors: number;
}

/**
 * DELETE /api/admin/cleanup
 *
 * Delete all data for specified targets. Admin-only.
 *
 * Body: { targets: ['page-library', 'meta-tag-analyser', 'all'] }
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const body = await request.json();
    const { targets } = body as { targets?: CleanupTarget[] };

    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json(
        { error: 'targets array is required' },
        { status: 400 }
      );
    }

    const validTargets: CleanupTarget[] = ['page-library', 'meta-tag-analyser', 'all'];
    const invalidTargets = targets.filter(t => !validTargets.includes(t));
    if (invalidTargets.length > 0) {
      return NextResponse.json(
        { error: `Invalid targets: ${invalidTargets.join(', ')}. Valid targets: ${validTargets.join(', ')}` },
        { status: 400 }
      );
    }

    const result: CleanupResult = {
      pageSnapshots: 0,
      pageStores: 0,
      metaTagAnalyses: 0,
      pendingScans: 0,
      blobsDeleted: 0,
      blobErrors: 0,
    };

    const shouldCleanPageLibrary = targets.includes('all') || targets.includes('page-library');
    const shouldCleanMetaTagAnalyser = targets.includes('all') || targets.includes('meta-tag-analyser');

    // Clean Page Library data (PageSnapshot, PageStore, and their blobs)
    if (shouldCleanPageLibrary) {
      // First, delete all blobs from Vercel Blob storage
      const snapshots = await PageSnapshot.find({}, { blobUrl: 1 });

      for (const snapshot of snapshots) {
        try {
          await deletePageHtml(snapshot.blobUrl);
          result.blobsDeleted++;
        } catch (error) {
          console.error(`Failed to delete blob for snapshot ${snapshot._id}:`, error);
          result.blobErrors++;
        }
      }

      // Delete all PageSnapshot documents
      const snapshotDeleteResult = await PageSnapshot.deleteMany({});
      result.pageSnapshots = snapshotDeleteResult.deletedCount;

      // Delete all PageStore documents
      const storeDeleteResult = await PageStore.deleteMany({});
      result.pageStores = storeDeleteResult.deletedCount;
    }

    // Clean Meta Tag Analyser data
    if (shouldCleanMetaTagAnalyser) {
      // Delete all MetaTagAnalysis documents
      const analysisDeleteResult = await MetaTagAnalysis.deleteMany({});
      result.metaTagAnalyses = analysisDeleteResult.deletedCount;

      // Delete all PendingScan documents
      const pendingDeleteResult = await PendingScan.deleteMany({});
      result.pendingScans = pendingDeleteResult.deletedCount;
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      deleted: result,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 500 }
    );
  }
}
