import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Webhook endpoint for receiving tracking updates from external API
 * 
 * Your tracking API should send POST requests to:
 * https://yourdomain.com/api/webhooks/tracking
 * 
 * With payload like:
 * {
 *   "trackingNumber": "CONT-12345",
 *   "event": {
 *     "status": "Departed Origin Port",
 *     "location": "Port of Los Angeles",
 *     "timestamp": "2025-12-07T10:00:00Z",
 *     "description": "Container departed on vessel",
 *     "vesselName": "MSC GULSUN",
 *     "latitude": 33.7701,
 *     "longitude": -118.1937
 *   }
 * }
 */
export async function POST(request: NextRequest) {
	try {
		// Verify webhook signature (if your API provides one)
		const signature = request.headers.get('x-webhook-signature');
		const webhookSecret = process.env.TRACKING_WEBHOOK_SECRET;

		if (webhookSecret && signature) {
			// Verify signature here
			// const isValid = verifySignature(signature, body, webhookSecret);
			// if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
		}

		const body = await request.json();
		const { trackingNumber, event } = body;

		if (!trackingNumber || !event) {
			return NextResponse.json(
				{ error: 'Missing trackingNumber or event' },
				{ status: 400 }
			);
		}

		// Find container by tracking number
		const container = await prisma.container.findFirst({
			where: { trackingNumber },
		});

		if (!container) {
			console.log(`Container not found for tracking number: ${trackingNumber}`);
			return NextResponse.json(
				{ error: 'Container not found' },
				{ status: 404 }
			);
		}

		// Check if event already exists (avoid duplicates)
		const eventDate = new Date(event.timestamp);
		const existingEvent = await prisma.containerTrackingEvent.findFirst({
			where: {
				containerId: container.id,
				status: event.status,
				eventDate: {
					gte: new Date(eventDate.getTime() - 60000), // Within 1 minute before
					lte: new Date(eventDate.getTime() + 60000), // Within 1 minute after
				},
			},
		});

		if (existingEvent) {
			console.log('Duplicate event, skipping');
			return NextResponse.json({
				success: true,
				message: 'Event already exists',
			});
		}

		// Create tracking event
		const trackingEvent = await prisma.containerTrackingEvent.create({
			data: {
				containerId: container.id,
				status: event.status,
				location: event.location || undefined,
				vesselName: event.vesselName || undefined,
				description: event.description || undefined,
				eventDate,
				source: 'API',
				completed: isCompletedStatus(event.status),
				latitude: event.latitude || undefined,
				longitude: event.longitude || undefined,
			},
		});

		// Update container progress and last location update
		const progress = calculateProgress(event.status);
		await prisma.container.update({
			where: { id: container.id },
			data: {
				progress,
				lastLocationUpdate: new Date(),
				currentLocation: event.location || container.currentLocation,
			},
		});

		console.log(`Tracking event created for container ${container.id}`);

		return NextResponse.json({
			success: true,
			message: 'Tracking event created',
			eventId: trackingEvent.id,
		});
	} catch (error) {
		console.error('Error processing tracking webhook:', error);
		return NextResponse.json(
			{ success: false, error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

function isCompletedStatus(status: string): boolean {
	const completedStatuses = ['delivered', 'completed', 'arrived', 'released', 'cleared'];
	return completedStatuses.some((s) => status.toLowerCase().includes(s));
}

function calculateProgress(status: string): number {
	const statusLower = status.toLowerCase();
	
	if (statusLower.includes('book')) return 10;
	if (statusLower.includes('pickup') || statusLower.includes('empty')) return 20;
	if (statusLower.includes('loaded')) return 30;
	if (statusLower.includes('depart')) return 40;
	if (statusLower.includes('transit') || statusLower.includes('ocean')) return 60;
	if (statusLower.includes('arrived')) return 75;
	if (statusLower.includes('customs')) return 85;
	if (statusLower.includes('released') || statusLower.includes('cleared')) return 90;
	if (statusLower.includes('delivery') || statusLower.includes('out for')) return 95;
	if (statusLower.includes('delivered') || statusLower.includes('completed')) return 100;
	
	return 50;
}
