import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { PDFParse } from 'pdf-parse';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  type AuctionRateEntry,
  buildStateRatesFromAuctionRates,
  normalizeShippingRateConfig,
  parseShippingRatesFromText,
  US_STATES,
} from '@/lib/shipping-rate-calculator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_SETTINGS = {
  theme: 'futuristic',
  accentColor: 'var(--accent-gold)',
  sidebarDensity: 'comfortable',
  animationsEnabled: true,
  notifyShipmentEmail: true,
  notifyShipmentPush: true,
  notifyPaymentEmail: true,
  notifyCriticalSms: false,
  twoFactorEnabled: false,
  language: 'en',
};

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const parsed = await parser.getText();
    return parsed.text.replace(/\s+/g, ' ').trim();
  } finally {
    await parser.destroy();
  }
}

type PdfTextItem = {
  str: string;
  x: number;
  y: number;
};

const stateHeaderPattern = /^([A-Z][A-Z\s.]+)\(([A-Z]{2})\)$/;
const stateCodes = new Set(US_STATES.map((state) => state.code));

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

async function extractAuctionRatesFromPdf(buffer: Buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const document = await pdfjs.getDocument({ data }).promise;
  const entries: AuctionRateEntry[] = [];
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

    const headers = items
      .map((item) => {
        const compact = item.str.replace(/\s+/g, '');
        const match = compact.match(stateHeaderPattern);
        return match && stateCodes.has(match[2])
          ? {
            stateCode: match[2],
            y: item.y,
            loadingPoint: findLoadingPoint(items, item.y),
          }
          : null;
      })
      .filter((item): item is { stateCode: string; y: number; loadingPoint: string | null } => Boolean(item))
      .sort((left, right) => right.y - left.y);

    const groups: Array<{ stateCode: string; loadingPoint: string | null; top: number; bottom: number }> = [];

    if (headers.length && carryStateCode) {
      groups.push({
        stateCode: carryStateCode,
        loadingPoint: carryLoadingPoint,
        top: Number.POSITIVE_INFINITY,
        bottom: headers[0].y + 20,
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

  return entries;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'PDF file is required' }, { status: 400 });
    }
    const fileName = file.name.toLowerCase();
    const isPdf = file.type.includes('pdf') || fileName.endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json({ message: 'Only PDF files can be imported' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ message: 'PDF file must be 8MB or smaller' }, { status: 400 });
    }

    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });
    const existingConfig = normalizeShippingRateConfig(existingSettings?.calculatorConfig);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const [extractedText, auctionRates] = await Promise.all([
      extractPdfText(fileBuffer),
      extractAuctionRatesFromPdf(fileBuffer),
    ]);
    const stateRatesFromAuctionRates = buildStateRatesFromAuctionRates(auctionRates);
    const importedRates = Object.keys(stateRatesFromAuctionRates).length
      ? stateRatesFromAuctionRates
      : parseShippingRatesFromText(extractedText);

    if (Object.keys(importedRates).length === 0) {
      return NextResponse.json({
        message: 'No rates were found in the PDF. Expected the Jacxi branch/city/total table or rows like "CA $1300".',
      }, { status: 422 });
    }

    const config = normalizeShippingRateConfig({
      ...existingConfig,
      destinationLabel: file.name.toLowerCase().includes('islam qala') ? 'Islam Qala, Afghanistan' : existingConfig.destinationLabel,
      stateRates: {
        ...existingConfig.stateRates,
        ...importedRates,
      },
      auctionRates: auctionRates.length ? auctionRates : existingConfig.auctionRates,
      updatedFromPdfName: file.name,
      updatedAt: new Date().toISOString(),
    });

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...DEFAULT_SETTINGS,
        calculatorConfig: config as unknown as Prisma.InputJsonValue,
      },
      update: {
        calculatorConfig: config as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      config: normalizeShippingRateConfig(settings.calculatorConfig),
      importedRates,
      importedCount: Object.keys(importedRates).length,
      importedAuctionRateCount: auctionRates.length,
      extractedTextPreview: extractedText.slice(0, 700),
    });
  } catch (error) {
    console.error('Error importing shipping rates from PDF:', error);
    return NextResponse.json({
      message: error instanceof Error ? error.message : 'Failed to import PDF rates',
    }, { status: 500 });
  }
}
