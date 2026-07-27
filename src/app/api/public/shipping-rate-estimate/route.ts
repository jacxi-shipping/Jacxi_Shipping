import { NextRequest, NextResponse } from 'next/server';
import { CompanyType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { buildAverageCompanyRateEstimate } from '@/lib/shipping-rate-average';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const originState = searchParams.get('originState') || '';
    const city = searchParams.get('city') || '';
    const branch = searchParams.get('branch') || '';
    const loadingPoint = searchParams.get('loadingPoint') || '';

    if (!/^[A-Za-z]{2}$/.test(originState.trim())) {
      return NextResponse.json({ error: 'originState must be a two-letter state code' }, { status: 400 });
    }

    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
        OR: [
          { companyType: CompanyType.SHIPPING },
          { isShipping: true },
        ],
      },
      select: {
        id: true,
        name: true,
        priceListConfig: true,
        priceLists: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            sourceFileName: true,
            config: true,
          },
        },
      },
    });

    const estimate = buildAverageCompanyRateEstimate(
      companies.map((company) => {
        const activeList = company.priceLists[0];
        return {
          companyId: company.id,
          companyName: company.name,
          priceListId: activeList?.id || null,
          priceListName: activeList?.name || null,
          sourceFileName: activeList?.sourceFileName || null,
          config: activeList?.config || company.priceListConfig,
        };
      }),
      originState,
      { city, branch, loadingPoint },
    );

    return NextResponse.json({
      estimate: {
        originState: estimate.originState,
        matchLevel: estimate.matchLevel,
        averageBaseRate: estimate.averageBaseRate,
        companyCount: estimate.companyCount,
        matchedAuctionRows: estimate.matchedAuctionRows,
      },
    });
  } catch (error) {
    console.error('Error building public shipping rate estimate:', error);
    return NextResponse.json({ error: 'Failed to build estimate' }, { status: 500 });
  }
}
