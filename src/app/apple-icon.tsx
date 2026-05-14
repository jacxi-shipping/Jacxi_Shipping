import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { siteBrandAssetFiles } from '@/lib/site-branding';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default async function AppleIcon() {
  try {
    const iconBuffer = await readFile(join(process.cwd(), siteBrandAssetFiles.favicon));
    return new Response(iconBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    // Fall back to the generated monogram when the branded asset has not been added yet.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#191C1F',
          color: '#DAA520',
          fontSize: 84,
          fontWeight: 700,
          borderRadius: 32,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        J
      </div>
    ),
    size
  );
}
