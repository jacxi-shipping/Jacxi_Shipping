import path from 'path';
import { pathToFileURL } from 'url';
import {
  type AuctionRateEntry,
  buildStateRatesFromAuctionRates,
  parseShippingRatesFromText,
  US_STATES,
} from '@/lib/shipping-rate-calculator';

type PdfTextItem = {
  str: string;
  x: number;
  y: number;
};

const stateHeaderPattern = /^([A-Z][A-Z\s.]+)\(([A-Z]{2})\)$/;
const stateCodes = new Set(US_STATES.map((state) => state.code));
const stateNameToCode = new Map(US_STATES.map((state) => [state.name.toUpperCase(), state.code]));

function parseMoney(value: string) {
  const parsed = Number(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function isMoney(value: string) {
  return /^\$?\s*[0-9][0-9,]*(?:\.\d{1,2})?$/.test(value.trim());
}

function findNearestText(items: PdfTextItem[], xMin: number, xMax: number, y: number) {
  return items
    .filter((item) => item.x >= xMin && item.x < xMax && Math.abs(item.y - y) <= 4)
    .sort((left, right) => Math.abs(left.y - y) - Math.abs(right.y - y))[0]?.str.trim() ?? '';
}

function findLoadingPoint(items: PdfTextItem[], y: number) {
  const match = items.find((item) => {
    const value = item.str.trim();
    return item.x >= 380
      && Math.abs(item.y - y) <= 8
      && !['BRANCH', 'CITY', 'TOTAL'].includes(value.toUpperCase())
      && !stateHeaderPattern.test(value.replace(/\s+/g, ''));
  });

  return match?.str.trim() || null;
}

function findStateHeader(items: PdfTextItem[], item: PdfTextItem) {
  const compact = item.str.replace(/\s+/g, '');
  const sameItemMatch = compact.match(stateHeaderPattern);
  if (sameItemMatch && stateCodes.has(sameItemMatch[2])) {
    return {
      stateCode: sameItemMatch[2],
      y: item.y,
      loadingPoint: findLoadingPoint(items, item.y),
    };
  }

  const stateCode = stateNameToCode.get(item.str.trim().replace(/\s+/g, ' ').toUpperCase());
  if (!stateCode || item.x < 40) return null;

  const codePattern = new RegExp(`^\\(?${stateCode}\\)?$`, 'i');
  const hasNearbyCode = items.some((candidate) => (
    candidate !== item
    && Math.abs(candidate.y - item.y) <= 3
    && Math.abs(candidate.x - item.x) <= 140
    && codePattern.test(candidate.str.trim())
  ));

  return hasNearbyCode
    ? {
      stateCode,
      y: item.y,
      loadingPoint: findLoadingPoint(items, item.y),
    }
    : null;
}

export async function extractAuctionRatesFromPdf(buffer: Buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(
    process.cwd(),
    'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
  )).href;
  const data = new Uint8Array(buffer);
  const document = await pdfjs.getDocument({ data }).promise;
  const entries: AuctionRateEntry[] = [];
  const textParts: string[] = [];
  let carryStateCode: string | null = null;
  let carryLoadingPoint: string | null = null;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items
      .map((item) => {
        const textItem = item as { str?: string; transform?: number[] };
        return {
          str: String(textItem.str ?? '').trim(),
          x: Math.round(textItem.transform?.[4] ?? 0),
          y: Math.round(textItem.transform?.[5] ?? 0),
        };
      })
      .filter((item) => item.str);
    textParts.push(...items.map((item) => item.str));

    const headers = Array.from(
      new Map(
        items
          .map((item) => findStateHeader(items, item))
          .filter((item): item is { stateCode: string; y: number; loadingPoint: string | null } => Boolean(item))
          .map((header) => [`${header.stateCode}:${header.y}`, header] as const),
      ).values(),
    ).sort((left, right) => right.y - left.y);

    const groups: Array<{ stateCode: string; loadingPoint: string | null; top: number; bottom: number }> = [];

    if (headers.length && carryStateCode) {
      groups.push({
        stateCode: carryStateCode,
        loadingPoint: carryLoadingPoint,
        top: Number.POSITIVE_INFINITY,
        bottom: headers[0].y + 20,
      });
    }

    if (!headers.length && carryStateCode) {
      groups.push({
        stateCode: carryStateCode,
        loadingPoint: carryLoadingPoint,
        top: Number.POSITIVE_INFINITY,
        bottom: 0,
      });
    }

    headers.forEach((header, index) => {
      const nextHeader = headers[index + 1];
      groups.push({
        stateCode: header.stateCode,
        loadingPoint: header.loadingPoint,
        top: header.y - 15,
        bottom: nextHeader ? nextHeader.y + 20 : 0,
      });
    });

    for (const group of groups) {
      const prices = items.filter((item) => (
        item.x >= 480
        && item.y < group.top
        && item.y > group.bottom
        && isMoney(item.str)
      ));

      for (const price of prices) {
        const total = parseMoney(price.str);
        if (!total || total < 500) continue;

        const branch = findNearestText(items, 0, 190, price.y);
        const city = findNearestText(items, 190, 430, price.y);
        if (!branch && !city) continue;

        entries.push({
          stateCode: group.stateCode,
          branch,
          city,
          total: Math.round(total),
          loadingPoint: group.loadingPoint,
        });
      }
    }

    if (headers.length) {
      const lastHeader = headers[headers.length - 1];
      carryStateCode = lastHeader.stateCode;
      carryLoadingPoint = lastHeader.loadingPoint;
    }
  }

  await document.destroy();

  return {
    entries,
    text: textParts.join(' ').replace(/\s+/g, ' ').trim(),
  };
}

export function getImportedRatesFromPdfText(auctionRates: AuctionRateEntry[], extractedText: string) {
  const stateRatesFromAuctionRates = buildStateRatesFromAuctionRates(auctionRates);
  return Object.keys(stateRatesFromAuctionRates).length
    ? stateRatesFromAuctionRates
    : parseShippingRatesFromText(extractedText);
}
