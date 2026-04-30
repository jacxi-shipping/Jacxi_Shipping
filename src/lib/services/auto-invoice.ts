/**
 * Auto Invoice Generation Service
 * Automatically creates invoices when containers are completed
 */

import { prisma } from '@/lib/db';

interface InvoiceGenerationResult {
	success: boolean;
	invoiceId?: string;
	amount?: number;
	message: string;
}

export class AutoInvoiceService {
	/**
	 * Generate invoice for container when status changes to DELIVERED or CLOSED
	 */
	async generateInvoiceForContainer(
		containerId: string
	): Promise<InvoiceGenerationResult> {
		try {
			// Get container with shipments
			const container = await prisma.container.findUnique({
				where: { id: containerId },
				include: {
					shipments: true,
					invoices: true,
				},
			});

			if (!container) {
				return {
					success: false,
					message: 'Container not found',
				};
			}

			// Filter cash-paid shipments in code
			const cashShipments = container.shipments.filter(
				(s) => s.paymentMode === 'CASH' && s.paymentStatus === 'COMPLETED'
			);

			// Update container reference with filtered shipments
			container.shipments = cashShipments;

			if (!container) {
				return {
					success: false,
					message: 'Container not found',
				};
			}

			// Check if container is in completed status
			if (container.status !== 'RELEASED' && container.status !== 'CLOSED') {
				return {
					success: false,
					message: 'Container is not in completed status',
				};
			}

			// Check if invoice already exists for this container
			const existingInvoice = container.invoices.find(
				(inv) => inv.notes?.includes('Auto-generated') || inv.invoiceNumber.includes('AUTO')
			);

			if (existingInvoice) {
				return {
					success: false,
					message: 'Invoice already generated for this container',
					invoiceId: existingInvoice.id,
				};
			}

			// Check if there are any CASH paid shipments
			if (container.shipments.length === 0) {
				return {
					success: false,
					message: 'No cash-paid shipments found in this container',
				};
			}

			// Calculate total amount from cash shipments
			const totalPrice = container.shipments.reduce(
				(sum, s) => sum + (s.price || 0),
				0
			);
			const totalInsurance = container.shipments.reduce(
				(sum, s) => sum + (s.insuranceValue || 0),
				0
			);
			const totalAmount = totalPrice + totalInsurance;

			if (totalAmount <= 0) {
				return {
					success: false,
					message: 'No revenue to invoice (total amount is zero)',
				};
			}

			// Generate invoice number
			const invoiceCount = await prisma.containerInvoice.count();
			const invoiceNumber = `AUTO-INV-${String(invoiceCount + 1).padStart(6, '0')}`;

			// Create invoice
			const invoice = await prisma.containerInvoice.create({
				data: {
					containerId: container.id,
					invoiceNumber,
					amount: totalAmount,
					currency: 'USD',
					date: new Date(),
					status: 'PAID', // Already paid (CASH)
					notes: `Auto-generated invoice for container ${container.trackingNumber || container.id}
					
Revenue Breakdown:
- Shipment Fees: $${totalPrice.toFixed(2)} (${container.shipments.length} vehicles)
- Insurance: $${totalInsurance.toFixed(2)}
- Total: $${totalAmount.toFixed(2)}

Payment Method: CASH (Collected)
Generated: ${new Date().toLocaleString()}`,
				},
			});

			return {
				success: true,
				invoiceId: invoice.id,
				amount: totalAmount,
				message: `Invoice ${invoiceNumber} generated successfully for $${totalAmount.toFixed(2)}`,
			};
		} catch (error) {
			console.error('Error generating invoice:', error);
			return {
				success: false,
				message: `Failed to generate invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
		}
	}

	/**
	 * Auto-generate invoices for all completed containers without invoices
	 */
	async generateInvoicesForCompletedContainers(): Promise<{
		processed: number;
		successful: number;
		failed: number;
		results: InvoiceGenerationResult[];
	}> {
		try {
			// Find completed containers
			const containers = await prisma.container.findMany({
				where: {
					status: {
						in: ['RELEASED', 'CLOSED'],
					},
				},
				include: {
					shipments: true,
					invoices: true,
				},
			});

			// Filter to only include containers with cash-paid shipments
			const containersWithCash = containers.map((container) => ({
				...container,
				shipments: container.shipments.filter(
					(s) => s.paymentMode === 'CASH' && s.paymentStatus === 'COMPLETED'
				),
			})).filter((c) => c.shipments.length > 0);

			const results: InvoiceGenerationResult[] = [];
			let successful = 0;
			let failed = 0;

			for (const container of containersWithCash) {
				// Skip if already has auto-generated invoice
				const hasAutoInvoice = container.invoices.some(
					(inv) => inv.notes?.includes('Auto-generated') || inv.invoiceNumber.includes('AUTO')
				);

				if (hasAutoInvoice) {
					continue;
				}

				// Skip if no cash shipments
				if (container.shipments.length === 0) {
					continue;
				}

				const result = await this.generateInvoiceForContainer(container.id);
				results.push(result);

				if (result.success) {
					successful++;
				} else {
					failed++;
				}

				// Add delay to avoid overwhelming the database
				await this.sleep(100);
			}

			return {
				processed: results.length,
				successful,
				failed,
				results,
			};
		} catch (error) {
			console.error('Error generating invoices for completed containers:', error);
			return {
				processed: 0,
				successful: 0,
				failed: 0,
				results: [],
			};
		}
	}

	/**
	 * Sleep utility
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Singleton instance
export const autoInvoice = new AutoInvoiceService();
