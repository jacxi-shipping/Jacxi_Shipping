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
import { DollarSign, X } from 'lucide-react';
import { Button, toast } from '@/components/design-system';

interface AddExpenseModalProps {
	open: boolean;
	onClose: () => void;
	containerId: string;
	onSuccess: () => void;
}

const expenseTypes = [
	{ value: 'SHIPPING_FEE', label: 'Shipping Fee' },
	{ value: 'PORT_CHARGES', label: 'Port Charges' },
	{ value: 'CUSTOMS_DUTY', label: 'Customs Duty' },
	{ value: 'STORAGE_FEE', label: 'Storage Fee' },
	{ value: 'HANDLING_FEE', label: 'Handling Fee' },
	{ value: 'INSURANCE', label: 'Insurance' },
	{ value: 'DOCUMENTATION', label: 'Documentation' },
	{ value: 'INLAND_TRANSPORT', label: 'Inland Transport' },
	{ value: 'INSPECTION', label: 'Inspection' },
	{ value: 'OTHER', label: 'Other' },
];

export default function AddExpenseModal({
	open,
	onClose,
	containerId,
	onSuccess,
}: AddExpenseModalProps) {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		type: 'SHIPPING_FEE',
		amount: '',
		currency: 'USD',
		vendor: '',
		invoiceNumber: '',
		date: new Date().toISOString().split('T')[0],
		notes: '',
	});

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			toast.error('Please enter a valid amount');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch(`/api/containers/${containerId}/expenses`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: formData.type,
					amount: parseFloat(formData.amount),
					currency: formData.currency,
					date: formData.date,
					vendor: formData.vendor || undefined,
					invoiceNumber: formData.invoiceNumber || undefined,
					notes: formData.notes || undefined,
				}),
			});

			if (response.ok) {
				toast.success('Expense added successfully');
				onSuccess();
				handleClose();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to add expense');
			}
		} catch (error) {
			console.error('Error adding expense:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (!loading) {
			setFormData({
				type: 'SHIPPING_FEE',
				amount: '',
				currency: 'USD',
				vendor: '',
				invoiceNumber: '',
				date: new Date().toISOString().split('T')[0],
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
					<DollarSign style={{ fontSize: 24, color: 'var(--accent-gold)' }} />
					<span>Add Expense</span>
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
					<FormControl fullWidth size="small" required>
						<InputLabel>Expense Type</InputLabel>
						<Select
							value={formData.type}
							onChange={(e) => handleChange('type', e.target.value)}
							label="Expense Type"
						>
							{expenseTypes.map((type) => (
								<MenuItem key={type.value} value={type.value}>
									{type.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>

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

					<TextField
						size="small"
						label="Vendor"
						value={formData.vendor}
						onChange={(e) => handleChange('vendor', e.target.value)}
						placeholder="e.g., Maersk Line, US Customs"
					/>

					<TextField
						size="small"
						label="Invoice Number"
						value={formData.invoiceNumber}
						onChange={(e) => handleChange('invoiceNumber', e.target.value)}
						placeholder="Vendor's invoice reference"
					/>

					<TextField
						size="small"
						label="Date"
						type="date"
						value={formData.date}
						onChange={(e) => handleChange('date', e.target.value)}
						required
						InputLabelProps={{ shrink: true }}
					/>

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
						{loading ? 'Adding...' : 'Add Expense'}
					</Button>
				</DialogActions>
			</Box>
		</Dialog>
	);
}
