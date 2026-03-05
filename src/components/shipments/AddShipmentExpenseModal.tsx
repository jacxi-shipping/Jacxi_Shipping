'use client';

import { useState, useEffect } from 'react';
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
	ToggleButton,
	ToggleButtonGroup,
} from '@mui/material';
import { DollarSign, X } from 'lucide-react';
import { Button, toast } from '@/components/design-system';

interface ShipmentOption {
	id: string;
	vehicleMake: string | null;
	vehicleModel: string | null;
	vehicleVIN?: string | null;
	user?: { name: string | null; email: string };
}

interface AddShipmentExpenseModalProps {
	open: boolean;
	onClose: () => void;
	/** Pre-selected shipment. Omit when providing `shipments` for the picker. */
	shipmentId?: string;
	/** When provided, shows a shipment selector dropdown. */
	shipments?: ShipmentOption[];
	onSuccess: () => void;
}

// Expense types matching the LedgerEntry metadata logic
const expenseTypes = [
	{ value: 'SHIPPING_FEE', label: 'Shipping Fee' },
	{ value: 'FUEL', label: 'Fuel' },
	{ value: 'PORT_CHARGES', label: 'Port Charges' },
	{ value: 'TOWING', label: 'Towing' },
	{ value: 'CUSTOMS', label: 'Customs' },
	{ value: 'STORAGE_FEE', label: 'Storage Fee' },
    { value: 'HANDLING_FEE', label: 'Handling Fee' },
    { value: 'INSURANCE', label: 'Insurance' },
	{ value: 'OTHER', label: 'Other' },
];

export default function AddShipmentExpenseModal({
	open,
	onClose,
	shipmentId: shipmentIdProp,
	shipments,
	onSuccess,
}: AddShipmentExpenseModalProps) {
	const [loading, setLoading] = useState(false);
	const [selectedShipmentId, setSelectedShipmentId] = useState(shipmentIdProp || '');
	const [formData, setFormData] = useState({
		expenseType: 'SHIPPING_FEE',
		amount: '',
		description: '',
		notes: '',
		paymentMode: 'DUE' as 'CASH' | 'DUE',
	});

	// Sync pre-selected shipmentId when a different row is clicked
	useEffect(() => {
		setSelectedShipmentId(shipmentIdProp || '');
	}, [shipmentIdProp]);

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const resolvedShipmentId = selectedShipmentId;

		if (!resolvedShipmentId) {
			toast.error('Please select a shipment');
			return;
		}

		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			toast.error('Please enter a valid amount');
			return;
		}

        if (!formData.description) {
            toast.error('Please enter a description');
            return;
        }

		setLoading(true);

		try {
			const response = await fetch('/api/ledger/expense', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shipmentId: resolvedShipmentId,
					expenseType: formData.expenseType,
					amount: parseFloat(formData.amount),
					description: formData.description,
					notes: formData.notes || undefined,
					paymentMode: formData.paymentMode,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				toast.success(data.message || 'Expense added successfully');
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
				expenseType: 'SHIPPING_FEE',
				amount: '',
				description: '',
				notes: '',
				paymentMode: 'DUE',
			});
			if (!shipmentIdProp) setSelectedShipmentId('');
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
					<span>Add Shipment Expense</span>
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
					{/* Shipment picker — only shown when a list is provided and no ID is pre-selected */}
					{shipments && !shipmentIdProp && (
						<FormControl fullWidth size="small" required>
							<InputLabel>Shipment</InputLabel>
							<Select
								value={selectedShipmentId}
								onChange={(e) => setSelectedShipmentId(e.target.value)}
								label="Shipment"
							>
								<MenuItem value=""><em>Select a shipment…</em></MenuItem>
								{shipments.map((s) => (
									<MenuItem key={s.id} value={s.id}>
										{s.vehicleMake} {s.vehicleModel}
										{s.vehicleVIN ? ` — ${s.vehicleVIN}` : ''}
										{s.user ? ` (${s.user.name || s.user.email})` : ''}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}

					<FormControl fullWidth size="small" required>
						<InputLabel>Expense Type</InputLabel>
						<Select
							value={formData.expenseType}
							onChange={(e) => handleChange('expenseType', e.target.value)}
							label="Expense Type"
						>
							{expenseTypes.map((type) => (
								<MenuItem key={type.value} value={type.value}>
									{type.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>

                    <TextField
						size="small"
						label="Description"
						value={formData.description}
						onChange={(e) => handleChange('description', e.target.value)}
						required
						placeholder="e.g. Extra towing fee"
					/>

					<TextField
						size="small"
						label="Amount (USD)"
						type="number"
						value={formData.amount}
						onChange={(e) => handleChange('amount', e.target.value)}
						required
						inputProps={{ min: 0, step: 0.01 }}
						InputProps={{
							startAdornment: <InputAdornment position="start">$</InputAdornment>,
						}}
					/>

					{/* Payment Mode */}
					<Box>
						<Box sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
							Payment Mode <span style={{ color: 'var(--error)' }}>*</span>
						</Box>
						<ToggleButtonGroup
							value={formData.paymentMode}
							exclusive
							onChange={(_, val) => { if (val) handleChange('paymentMode', val); }}
							size="small"
							fullWidth
						>
							<ToggleButton value="DUE" sx={{ flex: 1, textTransform: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
								Due (Owed)
							</ToggleButton>
							<ToggleButton value="CASH" sx={{ flex: 1, textTransform: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
								Cash (Paid)
							</ToggleButton>
						</ToggleButtonGroup>
						<Box sx={{ mt: 1, px: 0.5, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
							{formData.paymentMode === 'CASH'
								? '✓ Cash: adds a DEBIT charge and a CREDIT payment — customer has already paid.'
								: '⏳ Due: adds only a DEBIT charge — customer still owes this amount.'}
						</Box>
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
						{loading ? 'Adding...' : 'Add Expense'}
					</Button>
				</DialogActions>
			</Box>
		</Dialog>
	);
}
