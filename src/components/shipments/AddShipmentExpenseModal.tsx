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
	FormControlLabel,
	Checkbox,
} from '@mui/material';
import { DollarSign, X, Plus, Trash2 } from 'lucide-react';
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
	const isBulkMode = Boolean(shipments && !shipmentIdProp);

	const [loading, setLoading] = useState(false);
	const [selectedShipmentId, setSelectedShipmentId] = useState(shipmentIdProp || '');
	const [useSplitAmounts, setUseSplitAmounts] = useState(false);
	const [formData, setFormData] = useState({
		expenseType: 'SHIPPING_FEE',
		amount: '',
		companyAmount: '',
		description: '',
		notes: '',
		paymentMode: 'DUE' as 'CASH' | 'DUE',
	});
	const createEmptyItem = () => ({
		shipmentId: '',
		expenseType: 'SHIPPING_FEE',
		amount: '',
		companyAmount: '',
		description: '',
		notes: '',
		paymentMode: 'DUE' as 'CASH' | 'DUE',
		useSplitAmounts: false,
	});
	const [expenseItems, setExpenseItems] = useState([createEmptyItem()]);

	// Sync pre-selected shipmentId when a different row is clicked
	useEffect(() => {
		setSelectedShipmentId(shipmentIdProp || '');
	}, [shipmentIdProp]);

	useEffect(() => {
		if (open && isBulkMode) {
			setExpenseItems([createEmptyItem()]);
		}
	}, [open, isBulkMode]);

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (isBulkMode) {
			const hasEmptyShipment = expenseItems.some((item) => !item.shipmentId);
			if (hasEmptyShipment) {
				toast.error('Please select a shipment for all rows');
				return;
			}

			const hasInvalidAmount = expenseItems.some((item) => !item.amount || parseFloat(item.amount) <= 0);
			if (hasInvalidAmount) {
				toast.error('Please enter a valid amount for all rows');
				return;
			}

			const hasInvalidCompanyAmount = expenseItems.some(
				(item) => item.useSplitAmounts && (!item.companyAmount || parseFloat(item.companyAmount) <= 0)
			);
			if (hasInvalidCompanyAmount) {
				toast.error('Please enter a valid company amount for split rows');
				return;
			}

			const hasMissingDescription = expenseItems.some((item) => !item.description.trim());
			if (hasMissingDescription) {
				toast.error('Please enter a description for all rows');
				return;
			}

			setLoading(true);

			let successCount = 0;
			let failureCount = 0;

			for (const item of expenseItems) {
				try {
					const response = await fetch('/api/ledger/expense', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							shipmentId: item.shipmentId,
							expenseType: item.expenseType,
							amount: parseFloat(item.amount),
							...(item.useSplitAmounts ? { companyAmount: parseFloat(item.companyAmount) } : {}),
							description: item.description,
							notes: item.notes || undefined,
							paymentMode: item.paymentMode,
						}),
					});

					if (response.ok) {
						successCount += 1;
					} else {
						failureCount += 1;
					}
				} catch (error) {
					console.error('Error adding expense row:', error);
					failureCount += 1;
				}
			}

			if (successCount > 0) {
				toast.success(`${successCount} shipment expense${successCount > 1 ? 's' : ''} added successfully`);
				onSuccess();
				handleClose();
			}

			if (failureCount > 0) {
				toast.error(`${failureCount} row${failureCount > 1 ? 's' : ''} failed. Please review and retry.`);
			}

			setLoading(false);
			return;
		}

		const resolvedShipmentId = selectedShipmentId;

		if (!resolvedShipmentId) {
			toast.error('Please select a shipment');
			return;
		}

		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			toast.error('Please enter a valid amount');
			return;
		}

		if (useSplitAmounts && (!formData.companyAmount || parseFloat(formData.companyAmount) <= 0)) {
			toast.error('Please enter a valid company amount');
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
					...(useSplitAmounts ? { companyAmount: parseFloat(formData.companyAmount) } : {}),
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
				companyAmount: '',
				description: '',
				notes: '',
				paymentMode: 'DUE',
			});
			setUseSplitAmounts(false);
			setExpenseItems([createEmptyItem()]);
			if (!shipmentIdProp) setSelectedShipmentId('');
			onClose();
		}
	};

	const updateItem = (index: number, field: string, value: string | boolean) => {
		setExpenseItems((prev) =>
			prev.map((item, itemIndex) =>
				itemIndex === index ? { ...item, [field]: value } : item
			)
		);
	};

	const addItem = () => {
		setExpenseItems((prev) => [...prev, createEmptyItem()]);
	};

	const removeItem = (index: number) => {
		setExpenseItems((prev) => {
			if (prev.length === 1) return prev;
			return prev.filter((_, itemIndex) => itemIndex !== index);
		});
	};

	return (
		<Dialog 
			open={open} 
			onClose={handleClose} 
			maxWidth={isBulkMode ? 'md' : 'sm'} 
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
				<DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxHeight: '70vh', overflowY: 'auto' }}>
					{isBulkMode ? (
						<>
							<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
									Add multiple shipment expenses in one submission
								</Box>
								<Button type="button" variant="outline" size="sm" icon={<Plus className="w-4 h-4" />} onClick={addItem} disabled={loading}>
									Add Row
								</Button>
							</Box>

							{expenseItems.map((item, index) => (
								<Box key={`expense-row-${index}`} sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
									<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<Box sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Expense #{index + 1}</Box>
										<Button type="button" variant="outline" size="sm" icon={<Trash2 className="w-3 h-3" />} onClick={() => removeItem(index)} disabled={loading || expenseItems.length === 1}>
											Remove
										</Button>
									</Box>

									<FormControl fullWidth size="small" required>
										<InputLabel>Shipment</InputLabel>
										<Select value={item.shipmentId} onChange={(e) => updateItem(index, 'shipmentId', e.target.value)} label="Shipment">
											<MenuItem value=""><em>Select a shipment...</em></MenuItem>
											{shipments?.map((s) => (
												<MenuItem key={s.id} value={s.id}>
													{s.vehicleMake} {s.vehicleModel}{s.vehicleVIN ? ` - ${s.vehicleVIN}` : ''}{s.user ? ` (${s.user.name || s.user.email})` : ''}
												</MenuItem>
											))}
										</Select>
									</FormControl>

									<FormControl fullWidth size="small" required>
										<InputLabel>Expense Type</InputLabel>
										<Select value={item.expenseType} onChange={(e) => updateItem(index, 'expenseType', e.target.value)} label="Expense Type">
											{expenseTypes.map((type) => (
												<MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
											))}
										</Select>
									</FormControl>

									<TextField size="small" label="Description" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} required />

									<FormControlLabel
										control={<Checkbox checked={item.useSplitAmounts} onChange={(e) => updateItem(index, 'useSplitAmounts', e.target.checked)} size="small" />}
										label={<Box component="span" sx={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Use split amounts</Box>}
									/>

									{!item.useSplitAmounts ? (
										<TextField size="small" label="Amount (USD)" type="number" value={item.amount} onChange={(e) => updateItem(index, 'amount', e.target.value)} required inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
									) : (
										<>
											<TextField size="small" label="User Amount (USD)" type="number" value={item.amount} onChange={(e) => updateItem(index, 'amount', e.target.value)} required inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
											<TextField size="small" label="Company Amount (USD)" type="number" value={item.companyAmount} onChange={(e) => updateItem(index, 'companyAmount', e.target.value)} required inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
										</>
									)}

									<Box>
										<Box sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
											Payment Mode <span style={{ color: 'var(--error)' }}>*</span>
										</Box>
										<ToggleButtonGroup value={item.paymentMode} exclusive onChange={(_, val) => { if (val) updateItem(index, 'paymentMode', val); }} size="small" fullWidth>
											<ToggleButton value="DUE" sx={{ flex: 1, textTransform: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Due (Owed)</ToggleButton>
											<ToggleButton value="CASH" sx={{ flex: 1, textTransform: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Cash (Paid)</ToggleButton>
										</ToggleButtonGroup>
									</Box>

									<TextField size="small" label="Notes" value={item.notes} onChange={(e) => updateItem(index, 'notes', e.target.value)} multiline rows={2} />
								</Box>
							))}
						</>
					) : (
						<>
							{shipments && !shipmentIdProp && (
								<FormControl fullWidth size="small" required>
									<InputLabel>Shipment</InputLabel>
									<Select value={selectedShipmentId} onChange={(e) => setSelectedShipmentId(e.target.value)} label="Shipment">
										<MenuItem value=""><em>Select a shipment...</em></MenuItem>
										{shipments.map((s) => (
											<MenuItem key={s.id} value={s.id}>
												{s.vehicleMake} {s.vehicleModel}{s.vehicleVIN ? ` - ${s.vehicleVIN}` : ''}{s.user ? ` (${s.user.name || s.user.email})` : ''}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							)}

							<FormControl fullWidth size="small" required>
								<InputLabel>Expense Type</InputLabel>
								<Select value={formData.expenseType} onChange={(e) => handleChange('expenseType', e.target.value)} label="Expense Type">
									{expenseTypes.map((type) => (
										<MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
									))}
								</Select>
							</FormControl>

							<TextField size="small" label="Description" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} required placeholder="e.g. Extra towing fee" />

							<FormControlLabel
								control={<Checkbox checked={useSplitAmounts} onChange={(e) => setUseSplitAmounts(e.target.checked)} size="small" />}
								label={<Box component="span" sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Use different company and user amounts</Box>}
							/>

							{!useSplitAmounts ? (
								<TextField size="small" label="Amount (USD)" type="number" value={formData.amount} onChange={(e) => handleChange('amount', e.target.value)} required inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} helperText="Same amount charged to customer ledger and company ledger" />
							) : (
								<>
									<TextField size="small" label="User Amount (USD)" type="number" value={formData.amount} onChange={(e) => handleChange('amount', e.target.value)} required inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} helperText="Amount debited to customer ledger" />
									<TextField size="small" label="Company Amount (USD)" type="number" value={formData.companyAmount} onChange={(e) => handleChange('companyAmount', e.target.value)} required inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} helperText="Amount credited to company ledger (internal - not visible to customer)" />
								</>
							)}

							<Box>
								<Box sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
									Payment Mode <span style={{ color: 'var(--error)' }}>*</span>
								</Box>
								<ToggleButtonGroup value={formData.paymentMode} exclusive onChange={(_, val) => { if (val) handleChange('paymentMode', val); }} size="small" fullWidth>
									<ToggleButton value="DUE" sx={{ flex: 1, textTransform: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Due (Owed)</ToggleButton>
									<ToggleButton value="CASH" sx={{ flex: 1, textTransform: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Cash (Paid)</ToggleButton>
								</ToggleButtonGroup>
								<Box sx={{ mt: 1, px: 0.5, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
									{formData.paymentMode === 'CASH'
										? 'Cash: adds a DEBIT charge and a CREDIT payment.'
										: 'Due: adds only a DEBIT charge.'}
								</Box>
							</Box>

							<TextField size="small" label="Notes" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} multiline rows={3} placeholder="Additional details..." />
						</>
					)}
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
