import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

const sanitizeBoolean = (value: unknown) => {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		if (value.toLowerCase() === 'true') return true;
		if (value.toLowerCase() === 'false') return false;
	}
	return undefined;
};

const sanitizeString = (value: unknown) => {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length ? trimmed : undefined;
};

export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		let settings = await prisma.userSettings.findUnique({
			where: { userId: session.user.id },
		});

		if (!settings) {
			settings = await prisma.userSettings.create({
				data: {
					userId: session.user.id,
					...DEFAULT_SETTINGS,
				},
			});
		}

		return NextResponse.json({ settings }, { status: 200 });
	} catch (error) {
		console.error('Error fetching settings:', error);
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
	}
}

export async function PUT(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		const payload = await request.json();

		const updates: Record<string, string | boolean> = {};

		const theme = sanitizeString(payload.theme);
		const accentColor = sanitizeString(payload.accentColor);
		const sidebarDensity = sanitizeString(payload.sidebarDensity);
		const language = sanitizeString(payload.language);

		const animationsEnabled = sanitizeBoolean(payload.animationsEnabled);
		const notifyShipmentEmail = sanitizeBoolean(payload.notifyShipmentEmail);
		const notifyShipmentPush = sanitizeBoolean(payload.notifyShipmentPush);
		const notifyPaymentEmail = sanitizeBoolean(payload.notifyPaymentEmail);
		const notifyCriticalSms = sanitizeBoolean(payload.notifyCriticalSms);
		const twoFactorEnabled = sanitizeBoolean(payload.twoFactorEnabled);

		if (theme) updates.theme = theme;
		if (accentColor) updates.accentColor = accentColor;
		if (sidebarDensity) updates.sidebarDensity = sidebarDensity;
		if (language) updates.language = language;
		if (animationsEnabled !== undefined) updates.animationsEnabled = animationsEnabled;
		if (notifyShipmentEmail !== undefined) updates.notifyShipmentEmail = notifyShipmentEmail;
		if (notifyShipmentPush !== undefined) updates.notifyShipmentPush = notifyShipmentPush;
		if (notifyPaymentEmail !== undefined) updates.notifyPaymentEmail = notifyPaymentEmail;
		if (notifyCriticalSms !== undefined) updates.notifyCriticalSms = notifyCriticalSms;
		if (twoFactorEnabled !== undefined) updates.twoFactorEnabled = twoFactorEnabled;

		if (Object.keys(updates).length === 0) {
			return NextResponse.json({ message: 'No valid fields provided' }, { status: 400 });
		}

		const settings = await prisma.userSettings.upsert({
			where: { userId: session.user.id },
			create: {
				userId: session.user.id,
				...DEFAULT_SETTINGS,
				...updates,
			},
			update: updates,
		});

		return NextResponse.json({ settings }, { status: 200 });
	} catch (error) {
		console.error('Error updating settings:', error);
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
	}
}


