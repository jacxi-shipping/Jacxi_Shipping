import { NextRequest, NextResponse } from 'next/server';
import { trackingSync } from '@/lib/services/tracking-sync';

/**
 * Cron job endpoint for syncing tracking data
 * 
 * Setup with Vercel Cron Jobs:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-tracking",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 * 
 * Or use external cron service (cron-job.org, etc.)
 */
export async function GET(request: NextRequest) {
	try {
		// Verify cron secret for security
		const authHeader = request.headers.get('authorization');
		const cronSecret = process.env.CRON_SECRET;

		if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		console.log('[CRON] Starting tracking sync...');

		// Sync all active containers
		const result = await trackingSync.syncAllActiveContainers();

		console.log('[CRON] Tracking sync completed:', result);

		return NextResponse.json({
			success: true,
			message: 'Tracking sync completed',
			stats: result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('[CRON] Error in tracking sync:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// Alternative: POST method for manual triggers
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { containerId } = body;

		if (containerId) {
			// Sync specific container
			const result = await trackingSync.syncContainerTracking(containerId);
			return NextResponse.json({
				success: true,
				message: 'Container tracking synced',
				stats: result,
			});
		} else {
			// Sync all containers
			const result = await trackingSync.syncAllActiveContainers();
			return NextResponse.json({
				success: true,
				message: 'All containers synced',
				stats: result,
			});
		}
	} catch (error) {
		console.error('Error in manual sync:', error);
		return NextResponse.json(
			{ success: false, error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
