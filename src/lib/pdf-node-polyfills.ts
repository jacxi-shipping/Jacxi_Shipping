type PdfCanvasGlobals = typeof globalThis & {
  DOMMatrix?: unknown;
  DOMPoint?: unknown;
  DOMRect?: unknown;
  ImageData?: unknown;
  Path2D?: unknown;
};

let loaded = false;

export async function ensurePdfNodePolyfills() {
  if (loaded) return;

  const globals = globalThis as PdfCanvasGlobals;
  const canvas = await import('@napi-rs/canvas');

  globals.DOMMatrix ??= canvas.DOMMatrix;
  globals.DOMPoint ??= canvas.DOMPoint;
  globals.DOMRect ??= canvas.DOMRect;
  globals.ImageData ??= canvas.ImageData;
  globals.Path2D ??= canvas.Path2D;

  loaded = true;
}
