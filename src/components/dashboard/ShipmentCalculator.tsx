'use client';

import { useState } from 'react';
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

// Mock Rates Data (Base rates to Jebel Ali)
const STATE_RATES: Record<string, number> = {
    'AL': 1100, 'AK': 2500, 'AZ': 1250, 'AR': 1150, 'CA': 1300, 
    'CO': 1300, 'CT': 950,  'DE': 950,  'FL': 1000, 'GA': 1000,
    'HI': 2200, 'ID': 1400, 'IL': 1200, 'IN': 1150, 'IA': 1250,
    'KS': 1250, 'KY': 1100, 'LA': 1100, 'ME': 1100, 'MD': 950,
    'MA': 950,  'MI': 1200, 'MN': 1300, 'MS': 1100, 'MO': 1200,
    'MT': 1500, 'NE': 1300, 'NV': 1300, 'NH': 1000, 'NJ': 900,
    'NM': 1300, 'NY': 900,  'NC': 1000, 'ND': 1400, 'OH': 1100,
    'OK': 1200, 'OR': 1400, 'PA': 1000, 'RI': 950,  'SC': 1000,
    'SD': 1400, 'TN': 1100, 'TX': 1050, 'UT': 1350, 'VT': 1000,
    'VA': 950,  'WA': 1400, 'WV': 1100, 'WI': 1250, 'WY': 1400,
    'DC': 950
};

const VEHICLE_TYPES = [
    { id: 'sedan', label: 'Sedan', multiplier: 1 },
    { id: 'suv', label: 'SUV / Crossover', multiplier: 1.25 },
    { id: 'pickup', label: 'Pickup Truck', multiplier: 1.4 },
    { id: 'motorcycle', label: 'Motorcycle', multiplier: 0.6 },
    { id: 'van', label: 'Van', multiplier: 1.3 },
];

const STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District Of Columbia' },
    { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];

export default function ShipmentCalculator() {
    const [origin, setOrigin] = useState('');
    const [vehicleType, setVehicleType] = useState('sedan');
    const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

    const handleCalculate = () => {
        if (!origin) return;
        
        const baseRate = STATE_RATES[origin] || 1200; // Default fallback
        const multiplier = VEHICLE_TYPES.find(v => v.id === vehicleType)?.multiplier || 1;
        
        // Add random slight variation to make it look real (optional, but nice)
        // const variation = Math.floor(Math.random() * 50); 
        
        setEstimatedCost(Math.round(baseRate * multiplier));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
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
                        Instant quote to Jebel Ali (Dubai)
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
                                {origin ? STATES.find(s => s.code === origin)?.name : 'Origin (USA)'}
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
                                Jebel Ali, UAE
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
                                setEstimatedCost(null); // Reset on change
                            }}
                            sx={{ bgcolor: 'var(--background)' }}
                        >
                            {STATES.map((state) => (
                                <MenuItem key={state.code} value={state.code}>
                                    {state.name} ({state.code})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

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
                            {VEHICLE_TYPES.map((type) => (
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
