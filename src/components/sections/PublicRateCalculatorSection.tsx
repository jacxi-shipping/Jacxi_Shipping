'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calculator, Car, FileCheck, MapPin, Ship, Truck } from 'lucide-react';
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

const inputClassName = 'h-12 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm font-bold text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-gold)] focus:ring-4 focus:ring-[rgba(var(--accent-gold-rgb),0.16)]';
const labelClassName = 'grid gap-2';
const labelTextClassName = 'text-xs font-black uppercase text-[var(--text-secondary)]';

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
    <section id="calculator" className="relative overflow-hidden bg-[var(--background)] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.86fr_1.14fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-bold uppercase text-[var(--accent-gold)]">Instant estimate</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
              Price the route before you request a formal quote.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              Use the public calculator to plan pickup, vehicle type, and Afghanistan destination. The final quote is confirmed after exact pickup, condition, and customs details.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:max-w-xl">
              {[
                { icon: Truck, label: 'US pickup' },
                { icon: Ship, label: 'Ocean freight' },
                { icon: FileCheck, label: 'Customs support' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
                    <Icon className="h-5 w-5 text-[var(--accent-gold)]" />
                    <p className="mt-3 text-sm font-black text-[var(--text-primary)]">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[0_24px_80px_rgba(var(--text-primary-rgb),0.10)]"
          >
            <div className="border-b border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[var(--text-primary)]">Shipping calculator</h3>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {averageEstimate?.companyCount
                        ? `Average from ${averageEstimate.companyCount} company price list${averageEstimate.companyCount === 1 ? '' : 's'}`
                        : 'Planning estimate in USD'}
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm font-bold text-[var(--text-primary)]">
                  <MapPin className="h-4 w-4 text-[var(--accent-gold)]" />
                  Afghanistan lanes
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClassName}>
                  <span className={labelTextClassName}>US pickup state</span>
                  <select
                    value={originState}
                    onChange={(event) => setOriginState(event.target.value)}
                    className={inputClassName}
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

                <label className={labelClassName}>
                  <span className={labelTextClassName}>Vehicle type</span>
                  <select
                    value={vehicleType}
                    onChange={(event) => setVehicleType(event.target.value)}
                    className={inputClassName}
                  >
                    {DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </label>

                <label className={labelClassName}>
                  <span className={labelTextClassName}>Pickup city</span>
                  <input
                    value={pickupCity}
                    onChange={(event) => setPickupCity(event.target.value)}
                    placeholder="Los Angeles"
                    className={inputClassName}
                  />
                </label>

                <label className={labelClassName}>
                  <span className={labelTextClassName}>Auction branch</span>
                  <input
                    value={pickupBranch}
                    onChange={(event) => setPickupBranch(event.target.value)}
                    placeholder="Los Angeles"
                    className={inputClassName}
                  />
                </label>

                <label className={`${labelClassName} sm:col-span-2`}>
                  <span className={labelTextClassName}>Destination</span>
                  <select
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    className={inputClassName}
                  >
                    {destinationOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}, Afghanistan</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-[var(--text-secondary)]">
                      {loadingEstimate ? 'Updating estimate' : 'Estimated range'}
                    </p>
                    <p className="mt-2 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
                      {formatCurrency(rangeLow)} - {formatCurrency(rangeHigh)}
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                    <Car className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-bold">{selectedState?.name || originState}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--accent-gold)]" />
                  <span className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-bold">{selectedDestination.label}</span>
                  {pickupCity.trim() ? <span className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-bold">{pickupCity.trim()}</span> : null}
                  <span className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-bold">{selectedVehicle.label}</span>
                  {averageEstimate?.companyCount ? (
                    <span className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1 font-bold">
                      {averageEstimate.matchLevel === 'lane' ? 'Lane matched' : 'State average'} - {averageEstimate.matchedAuctionRows} rows
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  Final pricing depends on exact pickup, vehicle condition, title status, and customs details.
                </p>
                <a
                  href={quoteHref}
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-gold)] px-5 text-sm font-black text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  Get exact quote
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
