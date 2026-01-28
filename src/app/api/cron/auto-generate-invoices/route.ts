import { NextRequest, NextResponse } from 'next/server';
import { autoInvoice } from '@/lib/services/auto-invoice';

/**
 * Cron job endpoint for auto-generating invoices
 * 
 * Setup with Vercel Cron Jobs:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/auto-generate-invoices",
 *     "schedule": "0 0 * * *"  // Once daily at midnight
 *   }]
 * }
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

		console.log('[CRON] Starting auto-invoice generation...');

		// Generate invoices for all completed containers
		const result = await autoInvoice.generateInvoicesForCompletedContainers();

		console.log('[CRON] Auto-invoice generation completed:', result);

		return NextResponse.json({
			success: true,
			message: 'Auto-invoice generation completed',
			stats: result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('[CRON] Error in auto-invoice generation:', error);
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

// Manual trigger
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { containerId } = body;

		if (containerId) {
			// Generate invoice for specific container
			const result = await autoInvoice.generateInvoiceForContainer(containerId);
			return NextResponse.json({
				success: result.success,
				message: result.message,
				invoice: result.invoiceId ? { id: result.invoiceId, amount: result.amount } : null,
			});
		} else {
			// Generate for all completed containers
			const result = await autoInvoice.generateInvoicesForCompletedContainers();
			return NextResponse.json({
				success: true,
				message: 'Batch invoice generation completed',
				stats: result,
			});
		}
	} catch (error) {
		console.error('Error in manual invoice generation:', error);
		return NextResponse.json(
			{ success: false, error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
