import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import {
  type AuctionRateEntry,
  normalizeShippingRateConfig,
  US_STATES,
} from '@/lib/shipping-rate-calculator';
import { extractAuctionRatesFromPdf, getImportedRatesFromPdfText } from '@/lib/shipping-rate-pdf-import';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_IMPORT_MODES = new Set(['replace', 'merge', 'add_new']);
const stateCodes = new Set(US_STATES.map((state) => state.code));

type ImportMode = 'replace' | 'merge' | 'add_new';

function normalizeImportMode(value: FormDataEntryValue | null): ImportMode {
  const mode = String(value || 'merge');
  return VALID_IMPORT_MODES.has(mode) ? mode as ImportMode : 'merge';
}

function uniqueAuctionKey(rate: AuctionRateEntry) {
  return [
    rate.stateCode,
    rate.branch.trim().toLowerCase(),
    rate.city.trim().toLowerCase(),
    String(Math.round(rate.total)),
    rate.loadingPoint?.trim().toLowerCase() || '',
  ].join('|');
}

function mergeAuctionRates(existing: AuctionRateEntry[], incoming: AuctionRateEntry[], mode: ImportMode) {
  if (mode === 'replace') return incoming;

  const seen = new Set(existing.map(uniqueAuctionKey));
  const next = [...existing];
  for (const rate of incoming) {
    const key = uniqueAuctionKey(rate);
    if (!seen.has(key)) {
      next.push(rate);
      seen.add(key);
    }
  }
  return next;
}

function buildStateRates(existing: Record<string, number>, imported: Record<string, number>, mode: ImportMode) {
  if (mode === 'replace') return imported;

  if (mode === 'add_new') {
    const next = { ...existing };
    for (const [stateCode, rate] of Object.entries(imported)) {
      if (!next[stateCode]) next[stateCode] = rate;
    }
    return next;
  }

  return {
    ...existing,
    ...imported,
  };
}

function buildWarnings(importedRates: Record<string, number>, auctionRates: AuctionRateEntry[]) {
  const warnings: string[] = [];
  const importedStateCodes = new Set(Object.keys(importedRates));
  const missingCommonStates = ['CA', 'TX', 'NJ', 'GA', 'MD'].filter((stateCode) => !importedStateCodes.has(stateCode));
  const invalidStates = Object.keys(importedRates).filter((stateCode) => !stateCodes.has(stateCode));
  const unusuallyLow = Object.entries(importedRates).filter(([, rate]) => rate < 500).map(([stateCode]) => stateCode);
  const unusuallyHigh = Object.entries(importedRates).filter(([, rate]) => rate > 6000).map(([stateCode]) => stateCode);

  if (missingCommonStates.length) warnings.push(`Missing common lanes: ${missingCommonStates.join(', ')}`);
  if (invalidStates.length) warnings.push(`Unknown states ignored: ${invalidStates.join(', ')}`);
  if (unusuallyLow.length) warnings.push(`Unusually low state rates: ${unusuallyLow.join(', ')}`);
  if (unusuallyHigh.length) warnings.push(`Unusually high state rates: ${unusuallyHigh.join(', ')}`);
  if (auctionRates.length === 0) warnings.push('No branch/city auction rows were detected; imported state-level rates only.');

  return warnings;
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        priceListConfig: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const action = String(formData.get('action') || 'import');
    const mode = normalizeImportMode(formData.get('mode'));
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isPdf = file.type.includes('pdf') || fileName.endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json({ error: 'Only PDF files can be imported' }, { status: 400 });
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF file must be 8MB or smaller' }, { status: 400 });
    }

    const existingConfig = normalizeShippingRateConfig(company.priceListConfig);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { entries: auctionRates, text: extractedText } = await extractAuctionRatesFromPdf(fileBuffer);
    const importedRates = getImportedRatesFromPdfText(auctionRates, extractedText);

    if (Object.keys(importedRates).length === 0) {
      return NextResponse.json({
        error: 'No rates were found in the PDF. Expected the Jacxi branch/city/total table or rows like "CA $1300".',
      }, { status: 422 });
    }

    const warnings = buildWarnings(importedRates, auctionRates);
    const destinationLabel = String(formData.get('destinationLabel') || '').trim()
      || (file.name.toLowerCase().includes('islam qala') ? 'Islam Qala, Afghanistan' : existingConfig.destinationLabel);
    const listName = String(formData.get('name') || '').trim()
      || `${company.name} price list`;
    const effectiveFromRaw = String(formData.get('effectiveFrom') || '').trim();
    const effectiveFrom = effectiveFromRaw ? new Date(`${effectiveFromRaw}T00:00:00`) : null;

    const config = normalizeShippingRateConfig({
      ...existingConfig,
      destinationLabel,
      stateRates: buildStateRates(existingConfig.stateRates, importedRates, mode),
      auctionRates: mergeAuctionRates(existingConfig.auctionRates, auctionRates, mode),
      updatedFromPdfName: file.name,
      updatedAt: new Date().toISOString(),
    });

    const preview = {
      fileName: file.name,
      mode,
      listName,
      destinationLabel,
      importedCount: Object.keys(importedRates).length,
      importedAuctionRateCount: auctionRates.length,
      totalStateRateCount: Object.keys(config.stateRates).length,
      totalAuctionRateCount: config.auctionRates.length,
      warnings,
      rows: auctionRates.slice(0, 300),
      stateRates: importedRates,
      extractedTextPreview: extractedText.slice(0, 700),
    };

    if (action === 'preview') {
      return NextResponse.json({ preview, config });
    }

    const [, priceList, updatedCompany] = await prisma.$transaction([
      prisma.companyPriceList.updateMany({
        where: { companyId: company.id, isActive: true },
        data: { isActive: false },
      }),
      prisma.companyPriceList.create({
        data: {
          companyId: company.id,
          name: listName,
          destinationLabel,
          sourceFileName: file.name,
          importMode: mode,
          config: config as unknown as Prisma.InputJsonValue,
          importedStateRateCount: Object.keys(importedRates).length,
          importedAuctionRateCount: auctionRates.length,
          warnings: warnings as unknown as Prisma.InputJsonValue,
          isActive: true,
          effectiveFrom: effectiveFrom && Number.isFinite(effectiveFrom.getTime()) ? effectiveFrom : null,
          importedBy: session.user.id as string,
        },
      }),
      prisma.company.update({
        where: { id: company.id },
        data: {
          priceListConfig: config as unknown as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          name: true,
          priceListConfig: true,
        },
      }),
    ]);

    return NextResponse.json({
      company: updatedCompany,
      priceList,
      config: normalizeShippingRateConfig(updatedCompany.priceListConfig),
      preview,
      importedRates,
      importedCount: Object.keys(importedRates).length,
      importedAuctionRateCount: auctionRates.length,
    });
  } catch (error) {
    console.error('Error importing company price list from PDF:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to import company price list',
    }, { status: 500 });
  }
}
