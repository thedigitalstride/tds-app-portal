import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { isAtLeastAdmin } from '@/lib/permissions';
import { connectDB, Idea } from '@tds/database';

export const dynamic = 'force-dynamic';

// GET /api/tools/ideation/[id] — Get full idea
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const idea = await Idea.findById(id)
      .populate('createdBy', 'name image')
      .populate('collaborators', 'name image')
      .populate('reviewers.userId', 'name image')
      .populate('reviewers.invitedBy', 'name image')
      .populate('comments.userId', 'name image')
      .lean();

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Check access
    const userId = session.user.id;
    const isOwner = idea.createdBy._id.toString() === userId;
    const isCollaborator = idea.collaborators?.some(
      (c: { _id: { toString(): string } }) => c._id.toString() === userId
    );
    const isReviewer = idea.reviewers?.some(
      (r: { userId: { _id: { toString(): string } } }) => r.userId._id.toString() === userId
    );
    const isAdmin = isAtLeastAdmin(session.user.role);

    if (!isOwner && !isCollaborator && !isReviewer && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ idea });
  } catch (error) {
    console.error('Error fetching idea:', error);
    return NextResponse.json({ error: 'Failed to fetch idea' }, { status: 500 });
  }
}

// PATCH /api/tools/ideation/[id] — Update title
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const { title } = await request.json();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const idea = await Idea.findOneAndUpdate(
      { _id: id, $or: [{ createdBy: session.user.id }, { collaborators: session.user.id }] },
      { title },
      { new: true }
    );

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ title: idea.title });
  } catch (error) {
    console.error('Error updating idea:', error);
    return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 });
  }
}

// DELETE /api/tools/ideation/[id] — Delete idea
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const idea = await Idea.findOneAndDelete({
      _id: id,
      createdBy: session.user.id,
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting idea:', error);
    return NextResponse.json({ error: 'Failed to delete idea' }, { status: 500 });
  }
}
