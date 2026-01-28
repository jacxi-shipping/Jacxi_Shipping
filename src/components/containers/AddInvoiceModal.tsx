'use client';

import { useState } from 'react';
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Box,
	InputAdornment,
} from '@mui/material';
import { FileText, X } from 'lucide-react';
import { Button, toast } from '@/components/design-system';

interface AddInvoiceModalProps {
	open: boolean;
	onClose: () => void;
	containerId: string;
	onSuccess: () => void;
}

const invoiceStatuses = [
	{ value: 'DRAFT', label: 'Draft' },
	{ value: 'SENT', label: 'Sent' },
	{ value: 'PAID', label: 'Paid' },
	{ value: 'OVERDUE', label: 'Overdue' },
	{ value: 'CANCELLED', label: 'Cancelled' },
];

export default function AddInvoiceModal({
	open,
	onClose,
	containerId,
	onSuccess,
}: AddInvoiceModalProps) {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		invoiceNumber: '',
		amount: '',
		currency: 'USD',
		vendor: '',
		date: new Date().toISOString().split('T')[0],
		dueDate: '',
		status: 'DRAFT',
		notes: '',
	});

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!formData.invoiceNumber.trim()) {
			toast.error('Please enter an invoice number');
			return;
		}

		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			toast.error('Please enter a valid amount');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch(`/api/containers/${containerId}/invoices`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					invoiceNumber: formData.invoiceNumber,
					amount: parseFloat(formData.amount),
					currency: formData.currency,
					vendor: formData.vendor || undefined,
					date: formData.date,
					dueDate: formData.dueDate || undefined,
					status: formData.status,
					notes: formData.notes || undefined,
				}),
			});

			if (response.ok) {
				toast.success('Invoice created successfully');
				onSuccess();
				handleClose();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to create invoice');
			}
		} catch (error) {
			console.error('Error creating invoice:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (!loading) {
			setFormData({
				invoiceNumber: '',
				amount: '',
				currency: 'USD',
				vendor: '',
				date: new Date().toISOString().split('T')[0],
				dueDate: '',
				status: 'DRAFT',
				notes: '',
			});
			onClose();
		}
	};

	return (
		<Dialog 
			open={open} 
			onClose={handleClose} 
			maxWidth="sm" 
			fullWidth
			PaperProps={{
				sx: {
					bgcolor: 'var(--panel)',
					border: '1px solid var(--border)',
				},
			}}
		>
			<DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<FileText style={{ fontSize: 24, color: 'var(--accent-gold)' }} />
					<span>Create Invoice</span>
				</Box>
				<Box
					component="button"
					onClick={handleClose}
					disabled={loading}
					sx={{
						border: 'none',
						background: 'transparent',
						cursor: 'pointer',
						padding: 0.5,
						display: 'flex',
						alignItems: 'center',
						color: 'var(--text-secondary)',
						'&:hover': { color: 'var(--text-primary)' },
					}}
				>
					<X style={{ fontSize: 20 }} />
				</Box>
			</DialogTitle>

			<Box component="form" onSubmit={handleSubmit}>
				<DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
					<TextField
						size="small"
						label="Invoice Number"
						value={formData.invoiceNumber}
						onChange={(e) => handleChange('invoiceNumber', e.target.value)}
						required
						placeholder="e.g., INV-2025-001"
						helperText="Unique invoice identifier"
					/>

					<Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
						<TextField
							size="small"
							label="Amount"
							type="number"
							value={formData.amount}
							onChange={(e) => handleChange('amount', e.target.value)}
							required
							inputProps={{ min: 0, step: 0.01 }}
							InputProps={{
								startAdornment: <InputAdornment position="start">$</InputAdornment>,
							}}
						/>
						<TextField
							size="small"
							label="Currency"
							value={formData.currency}
							onChange={(e) => handleChange('currency', e.target.value)}
							disabled
						/>
					</Box>

					<FormControl fullWidth size="small" required>
						<InputLabel>Status</InputLabel>
						<Select
							value={formData.status}
							onChange={(e) => handleChange('status', e.target.value)}
							label="Status"
						>
							{invoiceStatuses.map((status) => (
								<MenuItem key={status.value} value={status.value}>
									{status.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<TextField
						size="small"
						label="Customer/Vendor"
						value={formData.vendor}
						onChange={(e) => handleChange('vendor', e.target.value)}
						placeholder="Who will pay this invoice"
					/>

					<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
						<TextField
							size="small"
							label="Invoice Date"
							type="date"
							value={formData.date}
							onChange={(e) => handleChange('date', e.target.value)}
							required
							InputLabelProps={{ shrink: true }}
						/>
						<TextField
							size="small"
							label="Due Date"
							type="date"
							value={formData.dueDate}
							onChange={(e) => handleChange('dueDate', e.target.value)}
							InputLabelProps={{ shrink: true }}
							helperText="Optional"
						/>
					</Box>

					<TextField
						size="small"
						label="Notes"
						value={formData.notes}
						onChange={(e) => handleChange('notes', e.target.value)}
						multiline
						rows={3}
						placeholder="Additional details..."
					/>
				</DialogContent>

				<DialogActions sx={{ px: 3, pb: 3 }}>
					<Button variant="outline" onClick={handleClose} disabled={loading}>
						Cancel
					</Button>
					<Button type="submit" variant="primary" disabled={loading}>
						{loading ? 'Creating...' : 'Create Invoice'}
					</Button>
				</DialogActions>
			</Box>
		</Dialog>
	);
}
