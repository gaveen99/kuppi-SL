import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || './uploads');

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

function sanitizedFilePath(rawFilename: string): string | null {
  if (!rawFilename) return null;
  if (rawFilename.includes('\0')) return null;
  if (/[/\\]/.test(rawFilename) || rawFilename.includes('..')) return null;

  const resolved = path.resolve(UPLOADS_DIR, rawFilename);
  const prefix = UPLOADS_DIR.endsWith(path.sep)
    ? UPLOADS_DIR
    : UPLOADS_DIR + path.sep;
  if (resolved !== UPLOADS_DIR && !resolved.startsWith(prefix)) return null;
  if (resolved === UPLOADS_DIR) return null;
  return resolved;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;
    const filePath = sanitizedFilePath(filename);
    if (!filePath) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    const isImage = contentType.startsWith('image/');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    if (!isImage) {
      const safeDisplayName = filename.replace(/["\r\n]/g, '');
      headers['Content-Disposition'] = `attachment; filename="${safeDisplayName}"`;
    }

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
