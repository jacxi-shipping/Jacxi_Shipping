'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AdminRoute } from '@/components/auth/AdminRoute';
import Section from '@/components/layout/Section';
import { ArrowLeft, Download, Loader2, Ship, Anchor, Calendar, MapPin, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Stepper, Step, StepLabel, Box } from '@mui/material';
import { toast } from '@/lib/toast';

const steps = ['Basic Info', 'Shipping Details', 'Ports', 'Dates', 'Additional Info'];

export default function NewContainerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    containerNumber: '',
    trackingNumber: '',
    vesselName: '',
    voyageNumber: '',
    shippingLine: '',
    bookingNumber: '',
    loadingPort: '',
    destinationPort: '',
    transshipmentPorts: [''],
    loadingDate: '',
    departureDate: '',
    estimatedArrival: '',
    maxCapacity: 4,
    notes: '',
    autoTrackingEnabled: true,
  });

  const fetchContainerData = async () => {
    if (!formData.containerNumber.trim()) {
      setFetchError('Please enter a container number first');
      return;
    }

    setFetching(true);
    setFetchError(null);
    setFetchSuccess(null);

    try {
      const response = await fetch(`/api/containers/tracking?containerNumber=${encodeURIComponent(formData.containerNumber)}`);
      const data = await response.json();

      if (response.ok && data.trackingData) {
        const trackingData = data.trackingData;
        
        setFormData(prev => ({
          ...prev,
          trackingNumber: trackingData.trackingNumber || prev.trackingNumber,
          vesselName: trackingData.vesselName || prev.vesselName,
          voyageNumber: trackingData.voyageNumber || prev.voyageNumber,
          shippingLine: trackingData.shippingLine || prev.shippingLine,
          loadingPort: trackingData.loadingPort || prev.loadingPort,
          destinationPort: trackingData.destinationPort || prev.destinationPort,
          estimatedArrival: trackingData.estimatedArrival ? new Date(trackingData.estimatedArrival).toISOString().split('T')[0] : prev.estimatedArrival,
          departureDate: trackingData.departureDate ? new Date(trackingData.departureDate).toISOString().split('T')[0] : prev.departureDate,
          loadingDate: trackingData.loadingDate ? new Date(trackingData.loadingDate).toISOString().split('T')[0] : prev.loadingDate,
        }));
        
        setFetchSuccess('Container data fetched successfully! Please review and adjust as needed.');
      } else {
        setFetchError(data.message || 'Could not fetch container data. Please enter details manually.');
      }
    } catch (error) {
      console.error('Error fetching container data:', error);
      setFetchError('Failed to fetch container data. Please enter details manually.');
    } finally {
      setFetching(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        transshipmentPorts: formData.transshipmentPorts.filter(p => p.trim()),
      };

      const response = await fetch('/api/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Container created successfully!', 'Redirecting to container details...');
        router.push(`/dashboard/containers/${data.container.id}`);
      } else {
        toast.error('Failed to create container', data.error || 'An error occurred');
      }
    } catch (error) {
      console.error('Error creating container:', error);
      toast.error('Failed to create container', 'Please try again later');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: parseInt(e.target.value) || 0,
    }));
  };

  const addTransshipmentPort = () => {
    setFormData(prev => ({
      ...prev,
      transshipmentPorts: [...prev.transshipmentPorts, ''],
    }));
  };

  const removeTransshipmentPort = (index: number) => {
    setFormData(prev => ({
      ...prev,
      transshipmentPorts: prev.transshipmentPorts.filter((_, i) => i !== index),
    }));
  };

  const updateTransshipmentPort = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      transshipmentPorts: prev.transshipmentPorts.map((port, i) => i === index ? value : port),
    }));
  };

  return (
    <AdminRoute>
      <div className="light-surface min-h-screen bg-[var(--background)]">
        <Section className="pt-6 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Link href="/dashboard/containers">
                <Button variant="outline" size="sm" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 flex-shrink-0 text-xs sm:text-sm">
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Back
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] truncate">Create New Container</h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-1">Add a new container with tracking information.</p>
              </div>
            </div>
          </div>
        </Section>

        <Section className="pb-16">
          {/* Stepper */}
          <Box sx={{ width: '100%', mb: 4 }}>
            <Stepper 
              activeStep={activeStep} 
              alternativeLabel
              sx={{
                '& .MuiStepLabel-root .Mui-completed': {
                  color: 'var(--accent-gold)',
                },
                '& .MuiStepLabel-root .Mui-active': {
                  color: 'var(--accent-gold)',
                },
                '& .MuiStepLabel-label': {
                  color: 'var(--text-secondary)',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                },
                '& .MuiStepLabel-label.Mui-active': {
                  color: 'var(--accent-gold)',
                  fontWeight: 600,
                },
                '& .MuiStepLabel-label.Mui-completed': {
                  color: 'var(--text-primary)',
                },
                '& .MuiStepIcon-root': {
                  color: 'var(--border)',
                },
                '& .MuiStepIcon-root.Mui-active': {
                  color: 'var(--accent-gold)',
                },
                '& .MuiStepIcon-root.Mui-completed': {
                  color: 'var(--accent-gold)',
                },
              }}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Fetch Data Success/Error Messages */}
            {fetchSuccess && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{fetchSuccess}</p>
                </div>
              </div>
            )}
            {fetchError && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{fetchError}</p>
                </div>
              </div>
            )}

            {/* Step 0: Basic Information */}
            {activeStep === 0 && (
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  <Ship className="h-5 w-5 text-cyan-300" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="md:col-span-2">
                  <label htmlFor="containerNumber" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Container Number <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      id="containerNumber"
                      name="containerNumber"
                      value={formData.containerNumber}
                      onChange={handleChange}
                      required
                      className="flex-1 px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                      placeholder="e.g., ABCU1234567"
                    />
                    <Button
                      type="button"
                      onClick={fetchContainerData}
                      disabled={fetching || !formData.containerNumber.trim()}
                      variant="outline"
                      className="sm:w-auto w-full border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 whitespace-nowrap"
                    >
                      {fetching ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Fetch Data
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Enter container number and click &quot;Fetch Data&quot; to automatically retrieve shipping information
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="trackingNumber" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      id="trackingNumber"
                      name="trackingNumber"
                      value={formData.trackingNumber}
                      onChange={handleChange}
                      placeholder="Tracking identifier"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="bookingNumber" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Booking Number
                    </label>
                    <input
                      type="text"
                      id="bookingNumber"
                      name="bookingNumber"
                      value={formData.bookingNumber}
                      onChange={handleChange}
                      placeholder="Booking reference"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="maxCapacity" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Max Capacity (vehicles)
                    </label>
                    <input
                      type="number"
                      id="maxCapacity"
                      name="maxCapacity"
                      value={formData.maxCapacity}
                      onChange={handleNumberChange}
                      min="1"
                      max="20"
                      placeholder="e.g., 4"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Step 1: Shipping Details */}
            {activeStep === 1 && (
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  <Anchor className="h-5 w-5 text-cyan-300" />
                  Shipping Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vesselName" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Vessel Name
                    </label>
                    <input
                      type="text"
                      id="vesselName"
                      name="vesselName"
                      value={formData.vesselName}
                      onChange={handleChange}
                      placeholder="e.g., MSC GULSUN"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="voyageNumber" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Voyage Number
                    </label>
                    <input
                      type="text"
                      id="voyageNumber"
                      name="voyageNumber"
                      value={formData.voyageNumber}
                      onChange={handleChange}
                      placeholder="e.g., V123"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="shippingLine" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Shipping Line
                    </label>
                    <input
                      type="text"
                      id="shippingLine"
                      name="shippingLine"
                      value={formData.shippingLine}
                      onChange={handleChange}
                      placeholder="e.g., Maersk Line, MSC, CMA CGM, COSCO"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Step 2: Ports */}
            {activeStep === 2 && (
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  <MapPin className="h-5 w-5 text-cyan-300" />
                  Ports
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="loadingPort" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Loading Port
                    </label>
                    <input
                      type="text"
                      id="loadingPort"
                      name="loadingPort"
                      value={formData.loadingPort}
                      onChange={handleChange}
                      placeholder="e.g., Shanghai, China"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="destinationPort" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Destination Port
                    </label>
                    <input
                      type="text"
                      id="destinationPort"
                      name="destinationPort"
                      value={formData.destinationPort}
                      onChange={handleChange}
                      placeholder="e.g., Los Angeles, USA"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Transshipment Ports (Optional)
                  </label>
                  <div className="space-y-2">
                    {formData.transshipmentPorts.map((port, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={port}
                          onChange={(e) => updateTransshipmentPort(index, e.target.value)}
                          className="flex-1 px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                          placeholder={`Transshipment port ${index + 1}`}
                        />
                        <Button
                          type="button"
                          onClick={() => removeTransshipmentPort(index)}
                          variant="outline"
                          className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    onClick={addTransshipmentPort}
                    variant="outline"
                    className="mt-3 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                  >
                    + Add Transshipment Port
                  </Button>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Step 3: Dates */}
            {activeStep === 3 && (
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  <Calendar className="h-5 w-5 text-cyan-300" />
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="loadingDate" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Loading Date
                    </label>
                    <input
                      type="date"
                      id="loadingDate"
                      name="loadingDate"
                      value={formData.loadingDate}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="departureDate" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Departure Date
                    </label>
                    <input
                      type="date"
                      id="departureDate"
                      name="departureDate"
                      value={formData.departureDate}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="estimatedArrival" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Estimated Arrival
                    </label>
                    <input
                      type="date"
                      id="estimatedArrival"
                      name="estimatedArrival"
                      value={formData.estimatedArrival}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Step 4: Notes and Settings */}
            {activeStep === 4 && (
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                <CardTitle className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div>
                  <label htmlFor="notes" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent resize-none"
                    placeholder="Any additional notes or special instructions..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoTrackingEnabled"
                    name="autoTrackingEnabled"
                    checked={formData.autoTrackingEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, autoTrackingEnabled: e.target.checked }))}
                    className="w-5 h-5 text-cyan-500 border-cyan-500/30 rounded focus:ring-cyan-500/50"
                  />
                  <label htmlFor="autoTrackingEnabled" className="text-sm font-medium text-[var(--text-primary)]">
                    Enable automatic tracking updates
                  </label>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-3">
              <div className="flex gap-3">
                <Link href="/dashboard/containers">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                  >
                    Cancel
                  </Button>
                </Link>
                {activeStep > 0 && (
                  <Button
                    type="button"
                    onClick={handleBack}
                    variant="outline"
                    disabled={loading}
                    className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex gap-3">
                {activeStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={loading || (activeStep === 0 && !formData.containerNumber)}
                    className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] shadow-cyan-500/30"
                    style={{ color: 'white' }}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading || !formData.containerNumber}
                    className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] shadow-cyan-500/30"
                    style={{ color: 'white' }}
                  >
                    {loading ? 'Creating...' : 'Create Container'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Section>
      </div>
    </AdminRoute>
  );
}
