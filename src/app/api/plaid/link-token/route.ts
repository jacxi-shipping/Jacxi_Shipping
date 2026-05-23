import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPlaidClient, getPlaidWebhookUrl, isPlaidConfigured, PLAID_COUNTRY_CODES, PLAID_PRODUCTS } from '@/lib/financial/plaid';

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPlaidConfigured()) {
    return NextResponse.json({ error: 'Plaid is not configured' }, { status: 503 });
  }

  try {
    const client = getPlaidClient();
    const response = await client.linkTokenCreate({
      client_name: 'Jacxi Banking',
      language: 'en',
      country_codes: PLAID_COUNTRY_CODES,
      products: PLAID_PRODUCTS,
      user: {
        client_user_id: session.user.id,
      },
      transactions: {
        days_requested: 730,
      },
      account_filters: {
        depository: {
          account_subtypes: ['checking', 'savings'],
        },
      },
      ...(getPlaidWebhookUrl() ? { webhook: getPlaidWebhookUrl() } : {}),
    });

    return NextResponse.json({
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error('Error creating Plaid link token:', error);
    return NextResponse.json({ error: 'Failed to initialize Plaid Link' }, { status: 500 });
  }
}