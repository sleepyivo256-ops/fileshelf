import { getObject } from '@/lib/storage';

export async function GET(req, { params }) {
  const { file } = await params;
  if (!file) return new Response('Not Found', { status: 404 });

  // Look in covers folder in R2 / storage
  const key = `covers/${file}`;
  const fileData = await getObject(key);

  if (!fileData) {
    return new Response('Cover not found', { status: 404 });
  }

  return new Response(fileData.body, {
    headers: {
      'Content-Type': fileData.contentType || 'image/jpeg',
      'Content-Length': String(fileData.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
