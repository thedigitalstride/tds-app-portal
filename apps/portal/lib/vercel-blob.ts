import { put, del } from '@vercel/blob';

const BLOB_PREFIX = 'page-store';
const IDEATION_PREFIX = 'ideation-assets';

/**
 * Upload HTML content to Vercel Blob storage.
 * Returns the blob URL.
 */
export async function uploadPageHtml(
  urlHash: string,
  html: string,
  timestamp: Date
): Promise<{ url: string; size: number }> {
  const filename = `${BLOB_PREFIX}/${urlHash}/${timestamp.getTime()}.html`;

  const blob = await put(filename, html, {
    access: 'public',
    contentType: 'text/html; charset=utf-8',
  });

  return {
    url: blob.url,
    size: Buffer.byteLength(html, 'utf-8'),
  };
}

/**
 * Delete a page snapshot from Vercel Blob storage.
 */
export async function deletePageHtml(blobUrl: string): Promise<void> {
  try {
    await del(blobUrl);
  } catch (error) {
    // Log but don't throw - blob may already be deleted
    console.warn('Failed to delete blob:', blobUrl, error);
  }
}

/**
 * Fetch HTML content from Vercel Blob storage.
 */
export async function fetchPageHtml(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch blob: ${response.status}`);
  }
  return response.text();
}

/**
 * Upload a screenshot buffer to Vercel Blob storage.
 */
export async function uploadScreenshot(
  pathname: string,
  buffer: Buffer
): Promise<{ url: string }> {
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: 'image/png',
  });

  return { url: blob.url };
}

/**
 * Upload an ideation asset (image, PDF, spreadsheet) to Vercel Blob storage.
 */
export async function uploadIdeationAsset(
  ideaId: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; size: number }> {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const pathname = `${IDEATION_PREFIX}/${ideaId}/${Date.now()}-${sanitized}`;

  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType,
  });

  return { url: blob.url, size: buffer.length };
}

/**
 * Fetch a blob URL and return as Buffer.
 */
export async function fetchBlobAsBuffer(blobUrl: string): Promise<Buffer> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch blob: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
