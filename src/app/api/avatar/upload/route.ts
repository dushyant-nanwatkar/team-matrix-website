import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'Missing filename parameter' }, { status: 400 });
  }

  if (!request.body) {
    return NextResponse.json({ error: 'Missing file body' }, { status: 400 });
  }

  const access = (process.env.BLOB_ACCESS as 'public' | 'private') || 'private';

  let blob;
  try {
    blob = await put(filename, request.body, { access });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("private store") || msg.includes("public access") || msg.includes("private access")) {
      const fallbackAccess = access === "private" ? "public" : "private";
      blob = await put(filename, request.body, { access: fallbackAccess });
    } else {
      throw err;
    }
  }

  return NextResponse.json(blob);
}
