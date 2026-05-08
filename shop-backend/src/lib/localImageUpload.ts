import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Persist an uploaded temp file under /uploads/{folder}/ and return a public URL.
 * Used when Cloudinary env vars are not configured.
 */
export async function saveLocalProductImage(
  tempPath: string,
  originalName: string,
  folder: string
): Promise<{ url: string; publicId: null }> {
  const ext = path.extname(originalName) || '.jpg';
  const safeExt = /\.(jpe?g|png|gif|webp)$/i.test(ext) ? ext.toLowerCase() : '.jpg';
  const destDir = path.join(process.cwd(), 'uploads', folder);
  await fs.mkdir(destDir, { recursive: true });
  const name = `${Date.now()}-${randomUUID()}${safeExt}`;
  const destPath = path.join(destDir, name);
  try {
    await fs.rename(tempPath, destPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'EXDEV') throw err;
    // Windows may place temp uploads on another volume; fallback avoids cross-device rename failure.
    await fs.copyFile(tempPath, destPath);
    await fs.unlink(tempPath).catch(() => {});
  }
  const base = (process.env.BACKEND_PUBLIC_URL || `http://127.0.0.1:${process.env.PORT || 5000}`).replace(
    /\/$/,
    ''
  );
  const url = `${base}/uploads/${folder}/${name}`;
  return { url, publicId: null };
}
