'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calculator, Car, MapPin, Ship, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DEFAULT_SHIPPING_RATE_CONFIG,
  US_STATES,
} from '@/lib/shipping-rate-calculator';

const destinationOptions = [
  { id: 'kabul', label: 'Kabul', multiplier: 1 },
  { id: 'herat', label: 'Herat', multiplier: 1.04 },
  { id: 'mazar', label: 'Mazar-i-Sharif', multiplier: 1.08 },
  { id: 'kandahar', label: 'Kandahar', multiplier: 1.1 },
  { id: 'jalalabad', label: 'Jalalabad', multiplier: 1.03 },
];

const popularStates = ['CA', 'TX', 'NJ', 'GA', 'MD', 'FL', 'NY', 'PA', 'IL', 'OH'];

type PublicAverageEstimate = {
  averageBaseRate: number | null;
  companyCount: number;
  matchedAuctionRows: number;
  matchLevel: 'lane' | 'state' | 'none';
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: DEFAULT_SHIPPING_RATE_CONFIG.currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PublicRateCalculatorSection() {
  const [originState, setOriginState] = useState('CA');
  const [vehicleType, setVehicleType] = useState(DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes[0]?.id || 'sedan');
  const [destination, setDestination] = useState(destinationOptions[0].id);
  const [pickupCity, setPickupCity] = useState('');
  const [pickupBranch, setPickupBranch] = useState('');
  const [averageEstimate, setAverageEstimate] = useState<PublicAverageEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const selectedState = US_STATES.find((state) => state.code === originState);
  const selectedVehicle = DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes.find((type) => type.id === vehicleType)
    || DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes[0];
  const selectedDestination = destinationOptions.find((option) => option.id === destination) || destinationOptions[0];
  const baseRate = averageEstimate?.averageBaseRate || DEFAULT_SHIPPING_RATE_CONFIG.stateRates[originState] || DEFAULT_SHIPPING_RATE_CONFIG.fallbackRate;
  const estimate = Math.round(baseRate * selectedVehicle.multiplier * selectedDestination.multiplier);
  const rangeLow = Math.round(estimate * 0.92);
  const rangeHigh = Math.round(estimate * 1.12);
  const quoteParams = new URLSearchParams({
    pickupState: originState,
    pickupStateName: selectedState?.name || originState,
    pickupCity,
    pickupBranch,
    destinationProvince: selectedDestination.label,
    vehicleType: selectedVehicle.label,
    estimateLow: String(rangeLow),
    estimateHigh: String(rangeHigh),
  });
  const quoteHref = `?${quoteParams.toString()}#quote`;

  useEffect(() => {
    const controller = new AbortController();
    setLoadingEstimate(true);

    const params = new URLSearchParams({
      originState,
      city: pickupCity,
      branch: pickupBranch,
    });

    fetch(`/api/public/shipping-rate-estimate?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.estimate) {
          setAverageEstimate(data.estimate);
        } else {
          setAverageEstimate(null);
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setAverageEstimate(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingEstimate(false);
      });

    return () => controller.abort();
  }, [originState, pickupBranch, pickupCity]);

  const popularStateOptions = useMemo(
    () => popularStates
      .map((code) => US_STATES.find((state) => state.code === code))
      .filter((state): state is (typeof US_STATES)[number] => Boolean(state)),
    [],
  );

  return (
    <section id="calculator" className="relative overflow-hidden bg-white py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-[var(--accent-gold)]">
              Instant Estimate
            </p>
            <h2 className="max-w-xl text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
              Price your vehicle shipment before you request a quote.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Select a pickup state, vehicle type, and Afghanistan destination to get a quick planning estimate for the route.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Truck, label: 'US pickup' },
                { icon: Ship, label: 'Ocean freight' },
                { icon: MapPin, label: 'Afghanistan delivery' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <Icon className="h-5 w-5 text-[var(--accent-gold)]" />
                    <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="rounded-2xl border border-gray-200 bg-[var(--background)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-7"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-gold)] text-white">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-950">Shipping Calculator</h3>
                  <p className="text-sm text-gray-500">
                    {averageEstimate?.companyCount
                      ? `Average from ${averageEstimate.companyCount} company price list${averageEstimate.companyCount === 1 ? '' : 's'}`
                      : 'Planning estimate in USD'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-600">Pickup State</span>
                <select
                  value={originState}
                  onChange={(event) => setOriginState(event.target.value)}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-950"
                >
                  <optgroup label="Popular">
                    {popularStateOptions.map((state) => (
                      <option key={state.code} value={state.code}>{state.name} ({state.code})</option>
                    ))}
                  </optgroup>
                  <optgroup label="All states">
                    {US_STATES.map((state) => (
                      <option key={state.code} value={state.code}>{state.name} ({state.code})</option>
                    ))}
                  </optgroup>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-600">Vehicle Type</span>
                <select
                  value={vehicleType}
                  onChange={(event) => setVehicleType(event.target.value)}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-950"
                >
                  {DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-600">Pickup City</span>
                <input
                  value={pickupCity}
                  onChange={(event) => setPickupCity(event.target.value)}
                  placeholder="Los Angeles"
                  className="h-12 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-950"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-600">Auction Branch</span>
                <input
                  value={pickupBranch}
                  onChange={(event) => setPickupBranch(event.target.value)}
                  placeholder="Los Angeles"
                  className="h-12 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-950"
                />
              </label>

              <label className="grid gap-2 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-600">Destination</span>
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-950"
                >
                  {destinationOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}, Afghanistan</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                    {loadingEstimate ? 'Updating Estimate' : 'Estimated Range'}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-gray-950 sm:text-4xl">
                    {formatCurrency(rangeLow)} - {formatCurrency(rangeHigh)}
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-950 text-white">
                  <Car className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span>{selectedState?.name || originState}</span>
                <ArrowRight className="h-4 w-4 text-[var(--accent-gold)]" />
                <span>{selectedDestination.label}</span>
                {pickupCity.trim() ? <span>{pickupCity.trim()}</span> : null}
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold">{selectedVehicle.label}</span>
                {averageEstimate?.companyCount ? (
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold">
                    {averageEstimate.matchLevel === 'lane' ? 'Lane matched' : 'State average'} - {averageEstimate.matchedAuctionRows} rows
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-gray-500">
                Final pricing depends on exact pickup, vehicle condition, title status, and customs details.
              </p>
              <a
                href={quoteHref}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-gold)] px-5 text-sm font-bold text-white transition hover:brightness-95"
              >
                Get exact quote
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
