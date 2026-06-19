'use client';

import { useEffect, useState } from 'react';
import { 
    Box, 
    MenuItem, 
    FormControl, 
    Select, 
    InputLabel, 
    Typography,
    Paper
} from '@mui/material';
import { Button } from '@/components/design-system';
import { Calculator, MapPin, Truck, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    type AuctionRateEntry,
    DEFAULT_SHIPPING_RATE_CONFIG,
    US_STATES,
    type ShippingRateCalculatorConfig,
} from '@/lib/shipping-rate-calculator';

export default function ShipmentCalculator() {
    const [origin, setOrigin] = useState('');
    const [pickupLocation, setPickupLocation] = useState('');
    const [vehicleType, setVehicleType] = useState('sedan');
    const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
    const [config, setConfig] = useState<ShippingRateCalculatorConfig>(DEFAULT_SHIPPING_RATE_CONFIG);

    const stateAuctionRates = config.auctionRates.filter((rate) => rate.stateCode === origin);

    useEffect(() => {
        let isMounted = true;

        fetch('/api/settings/shipping-rates', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
                if (isMounted && data?.config) {
                    setConfig(data.config);
                    setVehicleType(data.config.vehicleTypes?.[0]?.id || 'sedan');
                }
            })
            .catch(() => {
                if (isMounted) setConfig(DEFAULT_SHIPPING_RATE_CONFIG);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const handleCalculate = () => {
        if (!origin) return;
        
        const selectedAuctionRate = pickupLocation
            ? stateAuctionRates[Number(pickupLocation)]
            : null;
        const baseRate = selectedAuctionRate?.total || config.stateRates[origin] || config.fallbackRate;
        const multiplier = config.vehicleTypes.find(v => v.id === vehicleType)?.multiplier || 1;
        
        setEstimatedCost(Math.round(baseRate * multiplier));
    };

    const formatAuctionRateLabel = (rate: AuctionRateEntry) => {
        const location = [rate.branch, rate.city].filter(Boolean).join(' - ');
        const loadingPoint = rate.loadingPoint ? ` to ${rate.loadingPoint}` : '';
        return `${location || rate.stateCode}${loadingPoint} (${formatCurrency(rate.total)})`;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: config.currency,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <Paper 
            elevation={0}
            sx={{ 
                p: 0, 
                borderRadius: 3, 
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: 'linear-gradient(145deg, var(--panel), var(--background))',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Box sx={{ 
                p: 3, 
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                backgroundColor: 'var(--panel)'
            }}>
                <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 2, 
                    bgcolor: 'var(--accent-gold)', 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(218, 165, 32, 0.3)'
                }}>
                    <Calculator size={24} />
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        Quick Rate Calculator
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                        Instant quote to {config.destinationLabel}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                
                {/* Route Visual */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.25,
                    bgcolor: 'var(--background)',
                    borderRadius: 2,
                    border: '1px solid var(--border)'
                }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
                            From
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MapPin size={16} className="text-red-500" />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {origin ? US_STATES.find(s => s.code === origin)?.name : 'Origin (USA)'}
                            </Typography>
                        </Box>
                    </Box>
                    <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
                            To
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MapPin size={16} className="text-green-500" />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {config.destinationLabel}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Pickup State</InputLabel>
                        <Select
                            value={origin}
                            label="Pickup State"
                            onChange={(e) => {
                                setOrigin(e.target.value);
                                setPickupLocation('');
                                setEstimatedCost(null); // Reset on change
                            }}
                            sx={{ bgcolor: 'var(--background)' }}
                        >
                            {US_STATES.map((state) => (
                                <MenuItem key={state.code} value={state.code}>
                                    {state.name} ({state.code})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {stateAuctionRates.length > 0 && (
                        <FormControl fullWidth size="small">
                            <InputLabel>Pickup Location</InputLabel>
                            <Select
                                value={pickupLocation}
                                label="Pickup Location"
                                onChange={(e) => {
                                    setPickupLocation(e.target.value);
                                    setEstimatedCost(null);
                                }}
                                sx={{ bgcolor: 'var(--background)' }}
                            >
                                <MenuItem value="">
                                    Lowest state rate ({formatCurrency(config.stateRates[origin] || config.fallbackRate)})
                                </MenuItem>
                                {stateAuctionRates.map((rate, index) => (
                                    <MenuItem key={`${rate.stateCode}-${rate.branch}-${rate.city}-${index}`} value={String(index)}>
                                        {formatAuctionRateLabel(rate)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <FormControl fullWidth size="small">
                        <InputLabel>Vehicle Type</InputLabel>
                        <Select
                            value={vehicleType}
                            label="Vehicle Type"
                            onChange={(e) => {
                                setVehicleType(e.target.value);
                                setEstimatedCost(null); // Reset on change
                            }}
                            sx={{ bgcolor: 'var(--background)' }}
                        >
                            {config.vehicleTypes.map((type) => (
                                <MenuItem key={type.id} value={type.id}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Box sx={{ mt: 'auto', pt: 1 }}>
                    <Button 
                        variant="primary" 
                        fullWidth 
                        size="lg"
                        onClick={handleCalculate}
                        disabled={!origin}
                        icon={<Truck size={18} />}
                    >
                        Calculate Rate
                    </Button>
                    <Typography
                        variant="caption"
                        sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'var(--text-secondary)' }}
                    >
                        Rates update daily and include standard handling.
                        {config.updatedFromPdfName ? ` Last PDF: ${config.updatedFromPdfName}.` : ''}
                    </Typography>
                </Box>

                <AnimatePresence>
                    {estimatedCost !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                        >
                            <Box sx={{ 
                                mt: 2, 
                                p: 2, 
                                borderRadius: 2, 
                                bgcolor: 'rgba(var(--accent-gold-rgb), 0.12)', 
                                border: '1px solid rgba(var(--accent-gold-rgb), 0.6)',
                                textAlign: 'center'
                            }}>
                                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Estimated Shipping Cost
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 800, color: 'var(--text-primary)', my: 1 }}>
                                    {formatCurrency(estimatedCost)}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                    *Rates are subject to change. Includes ocean freight & standard handling.
                                </Typography>
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
        </Paper>
    );
}
