import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { adminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || './uploads');

const MAX_FILE_SIZE = (() => {
  const n = Number(process.env.MAX_FILE_SIZE);
  return Number.isFinite(n) && n > 0 ? n : 10 * 1024 * 1024;
})();

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
]);

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(match[1]);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyAuth(request);
    if (!uid) {
      return NextResponse.json(
        { error: 'Sign in required to upload files.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE} bytes` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Only PDF and image files are accepted.' },
        { status: 400 }
      );
    }

    const extension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: 'File extension not allowed.' },
        { status: 400 }
      );
    }

    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true });
    }

    const filename = `${uuidv4()}${extension}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      file: {
        filename,
        originalFileName: file.name,
        filePath: `/uploads/${filename}`,
        fileSize: buffer.length,
        mimeType: file.type,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
