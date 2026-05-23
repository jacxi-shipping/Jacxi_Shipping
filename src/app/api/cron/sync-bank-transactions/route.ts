import { NextRequest, NextResponse } from 'next/server';
import { validateCronRequest } from '@/lib/cron-auth';
import { isPlaidConfigured } from '@/lib/financial/plaid';
import { syncAllPlaidItems } from '@/lib/financial/plaidSync';

export async function POST(request: NextRequest) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPlaidConfigured()) {
    return NextResponse.json({ error: 'Plaid is not configured' }, { status: 503 });
  }

  try {
    const results = await syncAllPlaidItems();
    return NextResponse.json({ syncedItems: results.length, results });
  } catch (error) {
    console.error('Error syncing Plaid items from cron:', error);
    return NextResponse.json({ error: 'Failed to sync bank transactions' }, { status: 500 });
  }
}