import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, Idea, type AttachmentType, type IAttachment } from '@tds/database';
import { uploadIdeationAsset } from '@/lib/vercel-blob';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

const ALLOWED_TYPES: Record<string, AttachmentType> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'application/pdf': 'pdf',
  'text/csv': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
};

// POST /api/tools/ideation/[id]/upload — Upload files for ideation conversation
export async function POST(
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

    const idea = await Idea.findById(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Check access
    const userId = session.user.id;
    const isOwner = idea.createdBy.toString() === userId;
    const isCollaborator = idea.collaborators.some(
      (c) => c.toString() === userId
    );
    if (!isOwner && !isCollaborator && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed per upload` },
        { status: 400 }
      );
    }

    const attachments: IAttachment[] = [];

    for (const file of files) {
      const attachmentType = ALLOWED_TYPES[file.type];
      if (!attachmentType) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type || file.name}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10MB limit` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const { url, size } = await uploadIdeationAsset(
        id,
        file.name,
        buffer,
        file.type
      );

      attachments.push({
        id: crypto.randomUUID(),
        filename: file.name,
        blobUrl: url,
        type: attachmentType,
        mimeType: file.type,
        size,
        uploadedAt: new Date(),
      });
    }

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}
