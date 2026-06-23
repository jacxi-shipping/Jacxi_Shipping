import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { normalizeShippingRateConfig } from '@/lib/shipping-rate-calculator';
import { extractAuctionRatesFromPdf, getImportedRatesFromPdfText } from '@/lib/shipping-rate-pdf-import';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: {
        priceListConfig: config as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        priceListConfig: true,
      },
    });

    return NextResponse.json({
      company: updatedCompany,
      config: normalizeShippingRateConfig(updatedCompany.priceListConfig),
      importedRates,
      importedCount: Object.keys(importedRates).length,
      importedAuctionRateCount: auctionRates.length,
      extractedTextPreview: extractedText.slice(0, 700),
    });
  } catch (error) {
    console.error('Error importing company price list from PDF:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to import company price list',
    }, { status: 500 });
  }
}
