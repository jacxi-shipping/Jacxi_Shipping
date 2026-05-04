import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { fetchCopartLotVehicleData } from '@/lib/copart/lot-scraper';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lotNumber: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'shipments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { lotNumber } = await params;
    const data = await fetchCopartLotVehicleData(lotNumber);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Copart lot data.';
    const status = message.includes('numeric') ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}