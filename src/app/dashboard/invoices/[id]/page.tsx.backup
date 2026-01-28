'use client';

import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Section from '@/components/layout/Section';
import { pdf } from '@react-pdf/renderer';
import { toast } from '@/lib/toast';
import {
	InvoicePdfTemplate,
	InvoicePdfCompanyInfo,
	InvoicePdfDetails,
	InvoicePdfSocialLink,
} from '@/components/pdf/InvoicePdfTemplate';

interface VinDecodeApiResult {
	Value?: string | null;
	Variable?: string | null;
}

interface VinDecodedSummary {
	make?: string;
	model?: string;
	year?: string;
	vehicleType?: string;
	bodyClass?: string;
}

const vinDetailsCache = new Map<string, VinDecodedSummary | null>();

const cleanDecodedValue = (value?: string | null) => {
	if (!value) return '';
	const trimmed = value.trim();
	if (!trimmed || trimmed.toLowerCase() === 'not applicable' || trimmed.toLowerCase() === 'null' || trimmed === '0') {
		return '';
	}
	return trimmed;
};

const decodeVinDetails = async (vin: string): Promise<VinDecodedSummary | null> => {
	const normalized = (vin || '').trim().toUpperCase();
	if (!normalized || normalized.length !== 17) {
		return null;
	}

	if (vinDetailsCache.has(normalized)) {
		return vinDetailsCache.get(normalized) ?? null;
	}

	try {
		const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${normalized}?format=json`);
		if (!response.ok) {
			throw new Error(`VIN decode request failed with status ${response.status}`);
		}

		const data = await response.json();
		const results: VinDecodeApiResult[] = Array.isArray(data?.Results) ? data.Results : [];

		if (!results.length) {
			vinDetailsCache.set(normalized, null);
			return null;
		}

		const getValue = (variable: string) => {
			const entry = results.find((item) => item?.Variable === variable);
			return cleanDecodedValue(entry?.Value);
		};

		const errorCode = getValue('Error Code');
		if (errorCode && errorCode !== '0') {
			vinDetailsCache.set(normalized, null);
			return null;
		}

		const summary: VinDecodedSummary = {
			make: getValue('Make') || undefined,
			model: getValue('Model') || undefined,
			year: getValue('Model Year') || undefined,
			vehicleType: getValue('Vehicle Type') || undefined,
			bodyClass: getValue('Body Class') || undefined,
		};

		vinDetailsCache.set(normalized, summary);
		return summary;
	} catch (error) {
		console.error('Error decoding VIN for invoice PDF:', error);
		vinDetailsCache.set(normalized, null);
		return null;
	}
};

interface InvoiceItem {
	id: string;
	vin: string;
	lotNumber: string;
	auctionCity: string;
	freightCost: number;
	towingCost: number;
	clearanceCost: number;
	vatCost: number;
	customsCost: number;
	otherCost: number;
	subtotalUSD: number;
	subtotalAED: number;
	vehicleMake?: string | null;
	vehicleModel?: string | null;
	vehicleYear?: string | number | null;
	vehicleType?: string | null;
	bodyClass?: string | null;
}

interface Invoice {
	id: string;
	invoiceNumber: string;
	status: string;
	exchangeRate: number;
	subtotalUSD: number;
	subtotalAED: number;
	totalUSD: number;
	totalAED: number;
	dueDate: string | null;
	paidDate: string | null;
	wireTransferDetails: string | null;
	overdue: boolean;
	createdAt: string;
	container: {
		containerNumber: string;
	};
	items: InvoiceItem[];
}

export default function InvoiceDetailPage() {
	const { data: session } = useSession();
	const params = useParams();
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const [loading, setLoading] = useState(true);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [showWireDetailsForm, setShowWireDetailsForm] = useState(false);
	const [wireDetails, setWireDetails] = useState('');

	const fetchInvoice = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/invoices/${params.id}`);
			if (response.ok) {
				const data = await response.json();
				setInvoice(data.invoice);
			}
		} catch (error) {
			console.error('Error fetching invoice:', error);
		} finally {
			setLoading(false);
		}
	}, [params.id]);

	const handleMarkPaid = async () => {
		if (!confirm('Mark this invoice as paid?')) return;

		setIsUpdating(true);
		try {
			const response = await fetch(`/api/invoices/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: 'PAID',
					paidDate: new Date().toISOString(),
					wireTransferDetails: invoice?.wireTransferDetails || wireDetails,
				}),
			});

			if (response.ok) {
				await fetchInvoice();
				setShowWireDetailsForm(false);
			} else {
				toast.error('Failed to update invoice', 'Please try again');
			}
		} catch (error) {
			console.error('Error updating invoice:', error);
			toast.error('Failed to update invoice', 'An error occurred. Please try again');
		} finally {
			setIsUpdating(false);
		}
	};

	const handleUpdateWireDetails = async () => {
		setIsUpdating(true);
		try {
			const response = await fetch(`/api/invoices/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					wireTransferDetails: wireDetails,
				}),
			});

			if (response.ok) {
				await fetchInvoice();
				setShowWireDetailsForm(false);
			} else {
				toast.error('Failed to update wire transfer details', 'Please try again');
			}
		} catch (error) {
			console.error('Error updating wire details:', error);
			toast.error('Failed to update wire transfer details', 'An error occurred. Please try again');
		} finally {
			setIsUpdating(false);
		}
	};

	useEffect(() => {
		void fetchInvoice();
	}, [fetchInvoice]);

	useEffect(() => {
		if (invoice) {
			setWireDetails(invoice.wireTransferDetails || '');
		}
	}, [invoice]);

	const handleExportPDF = async () => {
		if (!invoice) return;

		try {
			setIsExporting(true);
			const itemsWithVehicleInfo = await Promise.all(
				invoice.items.map(async (item) => {
					const decoded = await decodeVinDetails(item.vin);
					return {
						...item,
						vehicleMake: decoded?.make ?? item.vehicleMake ?? undefined,
						vehicleModel: decoded?.model ?? item.vehicleModel ?? undefined,
						vehicleYear: decoded?.year ?? item.vehicleYear ?? undefined,
						vehicleType: decoded?.vehicleType ?? item.vehicleType ?? undefined,
						bodyClass: decoded?.bodyClass ?? item.bodyClass ?? undefined,
					};
				}),
			);

			const companyInfo: InvoicePdfCompanyInfo = {
				name: 'Jacxi Logistics',
				addressLine1: 'Warehouse 12, Dubai Logistics City',
				addressLine2: 'Dubai, United Arab Emirates',
				phone: '+971 50 123 4567',
				email: 'finance@jacxi.com',
				website: 'https://www.jacxi.com',
			};

			const socialLinks: InvoicePdfSocialLink[] = [
				{ label: 'Website', url: 'https://www.jacxi.com' },
				{ label: 'Instagram', url: 'https://www.instagram.com/jacxilogistics' },
				{ label: 'LinkedIn', url: 'https://www.linkedin.com/company/jacxi' },
			];

			const invoiceDetails: InvoicePdfDetails = {
				invoiceNumber: invoice.invoiceNumber,
				status: invoice.status,
				issueDate: invoice.createdAt,
				dueDate: invoice.dueDate,
				paidDate: invoice.paidDate,
				containerNumber: invoice.container?.containerNumber,
				billedToName: session?.user?.name || undefined,
				billedToEmail: session?.user?.email || undefined,
				exchangeRate: invoice.exchangeRate,
				subtotalUSD: invoice.subtotalUSD,
				subtotalAED: invoice.subtotalAED,
				totalUSD: invoice.totalUSD,
				totalAED: invoice.totalAED,
				paymentStatusLabel: invoice.status,
				paymentNotes: invoice.overdue ? 'Status: Past Due' : 'Payment due upon receipt.',
				wireTransferDetails: invoice.wireTransferDetails,
				items: itemsWithVehicleInfo,
				notes: invoice.overdue
					? 'This invoice is currently overdue. Please remit payment immediately to avoid service interruptions.'
					: undefined,
			};

			const blob = await pdf(
				<InvoicePdfTemplate company={companyInfo} invoice={invoiceDetails} socialLinks={socialLinks} />,
			).toBlob();

			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${invoice.invoiceNumber}.pdf`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 0);
		} catch (error) {
			console.error('Error exporting invoice PDF:', error);
			toast.error('Failed to generate PDF', 'Unable to export. Please try again');
		} finally {
			setIsExporting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[var(--text-primary)] flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/30 border-t-cyan-400"></div>
			</div>
		);
	}

	if (!invoice) {
		return (
			<div className="min-h-screen bg-[var(--text-primary)] flex items-center justify-center">
				<div className="text-center">
					<p className="text-white/70 mb-4">Invoice not found</p>
					<Link href="/dashboard/invoices">
						<Button>Back to Invoices</Button>
					</Link>
				</div>
			</div>
		);
	}

	const getStatusColor = (status: string, overdue: boolean) => {
		if (status === 'PAID') return 'bg-green-500/20 text-green-400 border-green-500/30';
		if (overdue || status === 'OVERDUE') return 'bg-red-500/20 text-red-400 border-red-500/30';
		if (status === 'SENT') return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
		return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
	};

const formatUsd = (value: number) => `$${value.toFixed(2)}`;
const formatAed = (value: number) => `${value.toFixed(2)} AED`;

	return (
		<>
			<Section className="relative bg-[var(--text-primary)] py-8 sm:py-12 lg:py-16 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-[var(--text-primary)] via-[var(--text-primary)] to-[var(--text-primary)]" />
				<div className="absolute inset-0 opacity-[0.03]">
					<svg className="w-full h-full" preserveAspectRatio="none">
						<defs>
							<pattern id="grid-invoice-detail" width="40" height="40" patternUnits="userSpaceOnUse">
								<path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
							</pattern>
						</defs>
						<rect width="100%" height="100%" fill="url(#grid-invoice-detail)" className="text-cyan-400" />
					</svg>
				</div>

				<div className="relative z-10">
					<div className="flex items-center gap-6">
						<Link href="/dashboard/invoices">
							<Button variant="outline" size="sm" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
								<ArrowLeft className="w-4 h-4 mr-2" />
								Back
							</Button>
						</Link>
						<div className="flex-1">
							<div className="flex items-center gap-3 mb-2">
								<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">{invoice.invoiceNumber}</h1>
								<span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(invoice.status, invoice.overdue)}`}>
									{invoice.status} {invoice.overdue && '(Overdue)'}
								</span>
							</div>
							<p className="text-lg sm:text-xl text-white/70">Container: {invoice.container.containerNumber}</p>
						</div>
						<div className="flex gap-2">
							<Button
								onClick={handleExportPDF}
								variant="outline"
								disabled={isExporting}
								className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Download className="w-4 h-4 mr-2" />
								{isExporting ? 'Generating...' : 'Export PDF'}
							</Button>
							{invoice.status !== 'PAID' && (
								<Button onClick={handleMarkPaid} disabled={isUpdating} className="bg-green-500 text-white hover:bg-green-600">
									<CheckCircle className="w-4 h-4 mr-2" />
									Mark as Paid
								</Button>
							)}
						</div>
					</div>
				</div>
			</Section>

			<Section className="bg-[var(--text-primary)] py-8 sm:py-12">
				<div className="max-w-7xl mx-auto space-y-8">
					{/* Invoice Details */}
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="relative rounded-xl bg-[var(--text-primary)]/50 backdrop-blur-sm border border-cyan-500/30 p-6">
							<p className="text-sm text-white/70 mb-2">Exchange Rate</p>
							<p className="text-2xl font-bold text-cyan-400">{invoice.exchangeRate.toFixed(4)}</p>
							<p className="text-xs text-white/50 mt-1">USD to AED</p>
						</div>
						<div className="relative rounded-xl bg-[var(--text-primary)]/50 backdrop-blur-sm border border-cyan-500/30 p-6">
							<p className="text-sm text-white/70 mb-2">Due Date</p>
							<p className="text-lg font-semibold text-white">
								{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not set'}
							</p>
						</div>
						<div className="relative rounded-xl bg-[var(--text-primary)]/50 backdrop-blur-sm border border-cyan-500/30 p-6">
							<p className="text-sm text-white/70 mb-2">Paid Date</p>
							<p className="text-lg font-semibold text-white">
								{invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString() : 'Not paid'}
							</p>
						</div>
					</motion.div>

					{/* Items Table */}
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-xl bg-[var(--text-primary)]/50 backdrop-blur-sm border border-cyan-500/30 p-6 sm:p-8">
						<h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Itemized Breakdown</h2>

						{/* Desktop table */}
						<div className="hidden lg:block overflow-hidden rounded-xl border border-cyan-500/20 bg-[var(--text-primary)]/60 shadow-inner shadow-cyan-500/10">
							<table className="min-w-full table-fixed">
								<thead className="bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent">
									<tr className="text-left text-xs font-semibold uppercase tracking-wider text-white/70">
										<th className="py-4 pl-6 pr-4">Item</th>
										<th className="py-4 px-4">Auction</th>
										<th className="py-4 px-4 text-right">Freight</th>
										<th className="py-4 px-4 text-right">Towing</th>
										<th className="py-4 px-4 text-right">Clearance</th>
										<th className="py-4 px-4 text-right">VAT</th>
										<th className="py-4 px-4 text-right">Customs</th>
										<th className="py-4 px-4 text-right">Other</th>
										<th className="py-4 px-6 text-right">Subtotal</th>
									</tr>
								</thead>
								<tbody>
									{invoice.items.map((item, index) => (
										<tr
											key={item.id}
											className={`text-sm text-white/80 transition-colors ${index % 2 === 0 ? 'bg-white/5' : 'bg-transparent'} hover:bg-cyan-500/10`}
										>
											<td className="py-5 pl-6 pr-4 align-top">
												<div className="space-y-1">
													<p className="font-semibold text-white">{item.vin}</p>
													<p className="text-xs text-white/50">Lot #{item.lotNumber}</p>
												</div>
											</td>
											<td className="py-5 px-4 align-top text-white">{item.auctionCity}</td>
											<td className="py-5 px-4 text-right align-top">{formatUsd(item.freightCost)}</td>
											<td className="py-5 px-4 text-right align-top">{formatUsd(item.towingCost)}</td>
											<td className="py-5 px-4 text-right align-top">{formatUsd(item.clearanceCost)}</td>
											<td className="py-5 px-4 text-right align-top">{formatUsd(item.vatCost)}</td>
											<td className="py-5 px-4 text-right align-top">{formatUsd(item.customsCost)}</td>
											<td className="py-5 px-4 text-right align-top">{formatUsd(item.otherCost)}</td>
											<td className="py-5 px-6 text-right align-top">
												<div className="space-y-1">
													<p className="font-semibold text-cyan-300">{formatUsd(item.subtotalUSD)}</p>
													<p className="text-xs text-white/50">{formatAed(item.subtotalAED)}</p>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Mobile cards */}
						<div className="space-y-4 lg:hidden">
							{invoice.items.map((item) => (
								<div key={item.id} className="rounded-xl border border-cyan-500/20 bg-[var(--text-primary)]/80 p-4 shadow-lg shadow-cyan-500/10">
									<div className="flex items-center justify-between gap-4">
										<div>
											<p className="font-semibold text-white">{item.vin}</p>
											<p className="text-xs text-white/50">Lot #{item.lotNumber}</p>
										</div>
										<div className="text-right">
											<p className="text-sm font-semibold text-cyan-300">{formatUsd(item.subtotalUSD)}</p>
											<p className="text-xs text-white/50">{formatAed(item.subtotalAED)}</p>
										</div>
									</div>

									<div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/60">
										<div>
											<p className="text-white/40 uppercase tracking-wide">Auction</p>
											<p className="text-white/80 text-sm">{item.auctionCity}</p>
										</div>
										<div className="text-right">
											<p className="text-white/40 uppercase tracking-wide">Freight</p>
											<p className="text-white/80 text-sm">{formatUsd(item.freightCost)}</p>
										</div>
										<div>
											<p className="text-white/40 uppercase tracking-wide">Towing</p>
											<p className="text-white/80 text-sm">{formatUsd(item.towingCost)}</p>
										</div>
										<div className="text-right">
											<p className="text-white/40 uppercase tracking-wide">Clearance</p>
											<p className="text-white/80 text-sm">{formatUsd(item.clearanceCost)}</p>
										</div>
										<div>
											<p className="text-white/40 uppercase tracking-wide">VAT</p>
											<p className="text-white/80 text-sm">{formatUsd(item.vatCost)}</p>
										</div>
										<div className="text-right">
											<p className="text-white/40 uppercase tracking-wide">Customs</p>
											<p className="text-white/80 text-sm">{formatUsd(item.customsCost)}</p>
										</div>
										<div>
											<p className="text-white/40 uppercase tracking-wide">Other</p>
											<p className="text-white/80 text-sm">{formatUsd(item.otherCost)}</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</motion.div>

					{/* Totals */}
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="relative rounded-xl bg-[var(--text-primary)]/50 backdrop-blur-sm border border-cyan-500/30 p-6">
							<div className="flex items-center justify-between mb-4">
								<span className="text-sm font-medium text-white/70">Subtotal (USD)</span>
								<span className="text-xl font-bold text-white">${invoice.subtotalUSD.toFixed(2)}</span>
							</div>
							<div className="flex items-center justify-between mb-4">
								<span className="text-sm font-medium text-white/70">Subtotal (AED)</span>
								<span className="text-xl font-bold text-white">{invoice.subtotalAED.toFixed(2)} AED</span>
							</div>
							<div className="pt-4 border-t border-cyan-500/20">
								<div className="flex items-center justify-between">
									<span className="text-lg font-semibold text-white">Total (USD)</span>
									<span className="text-2xl font-bold text-cyan-400">${invoice.totalUSD.toFixed(2)}</span>
								</div>
								<div className="flex items-center justify-between mt-2">
									<span className="text-lg font-semibold text-white">Total (AED)</span>
									<span className="text-2xl font-bold text-cyan-400">{invoice.totalAED.toFixed(2)} AED</span>
								</div>
							</div>
						</div>

						{/* Payment Details */}
						<div className="relative rounded-xl bg-[var(--text-primary)]/50 backdrop-blur-sm border border-cyan-500/30 p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-bold text-white">Payment Information</h3>
								{!showWireDetailsForm && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowWireDetailsForm(true)}
										className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
									>
										{invoice.wireTransferDetails ? 'Edit' : 'Add'} Wire Details
									</Button>
								)}
							</div>
							{showWireDetailsForm ? (
								<div className="space-y-3">
									<textarea
										value={wireDetails}
										onChange={(e) => setWireDetails(e.target.value)}
										placeholder="Enter wire transfer details (bank name, account number, routing number, etc.)"
										rows={6}
										className="w-full px-4 py-3 bg-[var(--text-primary)] border border-cyan-500/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
									/>
									<div className="flex gap-2">
										<Button
											onClick={handleUpdateWireDetails}
											disabled={isUpdating}
											className="bg-[var(--accent-gold)] text-white hover:bg-[var(--accent-gold)]"
										>
											Save
										</Button>
										<Button
											variant="outline"
											onClick={() => {
												setShowWireDetailsForm(false);
												setWireDetails(invoice?.wireTransferDetails || '');
											}}
											disabled={isUpdating}
											className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
										>
											Cancel
										</Button>
									</div>
								</div>
							) : invoice.wireTransferDetails ? (
								<div className="space-y-3">
									<div className="p-4 rounded-lg bg-[var(--text-primary)]/50 border border-cyan-500/20">
										<p className="text-sm text-white/70 mb-2">Wire Transfer Details</p>
										<p className="text-sm text-white whitespace-pre-wrap">{invoice.wireTransferDetails}</p>
									</div>
								</div>
							) : (
								<p className="text-sm text-white/60">No payment details provided</p>
							)}
						</div>
					</motion.div>
				</div>
			</Section>
		</>
	);
}

