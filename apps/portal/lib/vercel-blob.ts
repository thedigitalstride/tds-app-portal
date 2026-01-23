import { put, del } from '@vercel/blob';

const BLOB_PREFIX = 'page-store';

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
