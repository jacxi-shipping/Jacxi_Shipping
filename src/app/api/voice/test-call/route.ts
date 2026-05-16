import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getStoredCallAgentSettings, getEffectiveGeminiApiKey } from '@/lib/call-agent-settings';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function createTwilioAuthHeader(settings: any) {
  if (settings.twilioApiKey && settings.twilioApiSecret) {
    return `Basic ${Buffer.from(`${settings.twilioApiKey}:${settings.twilioApiSecret}`).toString('base64')}`;
  }
  if (settings.twilioAccountSid && settings.twilioAuthToken) {
    return `Basic ${Buffer.from(`${settings.twilioAccountSid}:${settings.twilioAuthToken}`).toString('base64')}`;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json() as { toField?: string };
    const toField = payload.toField?.trim();

    if (!toField) {
      return NextResponse.json({ message: 'Phone number to call is required' }, { status: 400 });
    }

    const settings = await getStoredCallAgentSettings();
    const authHeader = createTwilioAuthHeader(settings);
    
    if (!authHeader || !settings.twilioAccountSid || !settings.twilioPhoneNumber) {
        return NextResponse.json({ message: 'Twilio settings missing' }, { status: 400 });
    }

    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const requestUrl = new URL(request.url);
    const protocol = forwardedProto || requestUrl.protocol.replace(':', '');
    const host = forwardedHost || request.headers.get('host') || requestUrl.host;
    const baseUrl = `${protocol}://${host}`;

    const webhookUrl = new URL('/api/voice', baseUrl);
    const voiceWebhookToken = process.env.VOICE_WEBHOOK_TOKEN?.trim() || '';
    if (voiceWebhookToken) {
      webhookUrl.searchParams.set('token', voiceWebhookToken);
    }
    
    const tokenPart = voiceWebhookToken ? `token=${voiceWebhookToken}&` : '';
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Redirect method="POST">${baseUrl}/api/voice?${tokenPart}step=intro</Redirect></Response>`;

    const body = new URLSearchParams({
        To: toField,
        From: settings.twilioPhoneNumber,
        Twiml: twiml
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${settings.twilioAccountSid}/Calls.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': authHeader,
        },
        body: body.toString(),
        cache: 'no-store'
    });

    if (!response.ok) {
        let errMessage = 'Twilio Error';
        try {
            const data = await response.json();
            errMessage = data.message || errMessage;
        } catch(e) {}
        return NextResponse.json({ message: errMessage }, { status: 400 });
    }

    const responseData = await response.json();

    return NextResponse.json({ message: 'Call initiated to ' + toField, success: true, sid: responseData.sid });

  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}
