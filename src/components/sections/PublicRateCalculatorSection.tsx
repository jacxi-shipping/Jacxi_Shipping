'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ChevronRight, DollarSign, MapPin, Truck } from 'lucide-react';
import Magnetic from '@/components/ui/Magnetic';

const origins = [
  { id: 'ca-east', name: 'East Coast (NY/NJ/PA)', price: 1200 },
  { id: 'ca-west', name: 'West Coast (CA/WA)', price: 1800 },
  { id: 'canada', name: 'Canada (Toronto/Montreal)', price: 1500 },
  { id: 'tx', name: 'South (TX/FL)', price: 1400 },
];

const destinations = [
  { id: 'kbl', name: 'Kabul via Mersin', price: 4500, time: '35-45 days' },
  { id: 'hrt', name: 'Herat via UAE', price: 4200, time: '30-40 days' },
  { id: 'kdh', name: 'Kandahar via UAE', price: 4400, time: '30-42 days' },
  { id: 'mez', name: 'Mazar-i-Sharif via Mersin', price: 4600, time: '38-48 days' },
];

const vehicleTypes = [
  { id: 'sedan', name: 'Standard Sedan', multiplier: 1 },
  { id: 'suv', name: 'SUV / Truck', multiplier: 1.25 },
  { id: 'van', name: 'Van / Large Cargo', multiplier: 1.5 },
];

export default function PublicRateCalculatorSection() {
  const [origin, setOrigin] = useState(origins[0]);
  const [dest, setDest] = useState(destinations[0]);
  const [vType, setVType] = useState(vehicleTypes[1]);

  const basePrice = (origin.price + dest.price) * vType.multiplier;

  return (
    <section className="relative bg-black py-32 text-white overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-3 justify-center mb-6">
            <span className="h-px w-6 bg-[#D4AF37]" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37]">Estimator</span>
            <span className="h-px w-6 bg-[#D4AF37]" />
          </div>
          <h2 className="text-5xl font-black tracking-tight sm:text-6xl text-white mb-6">
            Instant lane pricing.
          </h2>
          <p className="text-xl text-white/50">
            Generate an interactive estimate for the specific corridor combinations. For a binding contract, submit an official quote request.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] items-start">
          
          <div className="space-y-12">
            
            {/* Origin Selection */}
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37] mb-4">01. Origin Zone</p>
              <div className="grid grid-cols-2 gap-4">
                {origins.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setOrigin(o)}
                    className={`flex items-start p-4 rounded-[1.5rem] border text-left transition-all ${
                      origin.id === o.id 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.15)] ring-1 ring-[#D4AF37]/50'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <MapPin className={`h-5 w-5 shrink-0 mt-0.5 mr-3 ${origin.id === o.id ? 'text-[#D4AF37]' : 'text-white/30'}`} />
                    <span className={`font-semibold ${origin.id === o.id ? 'text-white' : 'text-white/60'}`}>{o.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Destination Selection */}
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37] mb-4">02. Destination Route</p>
              <div className="grid grid-cols-2 gap-4">
                {destinations.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDest(d)}
                    className={`flex flex-col items-start p-4 rounded-[1.5rem] border text-left transition-all ${
                      dest.id === d.id 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.15)] ring-1 ring-[#D4AF37]/50'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <span className={`font-semibold ${dest.id === d.id ? 'text-white' : 'text-white/60'}`}>{d.name}</span>
                    <span className={`text-[11px] font-mono mt-2 px-2 py-1 rounded-full ${dest.id === d.id ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/5 text-white/40'}`}>
                      {d.time}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Type Selection */}
            <div>
               <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37] mb-4">03. Vehicle Class</p>
               <div className="flex gap-4">
                  {vehicleTypes.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVType(v)}
                      className={`flex-1 flex justify-center py-4 rounded-full border transition-all ${
                        vType.id === v.id
                           ? 'border-[#D4AF37] bg-[#D4AF37] text-black font-bold shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                           : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white font-medium'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
               </div>
            </div>

          </div>

          <motion.div 
            className="sticky top-32 rounded-[3rem] border border-white/10 bg-[#0a0a0a] p-10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent pointer-events-none" />
            
            <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37] mb-12">Estimated Subtotal</p>
            
            <div className="flex items-start text-white mb-12">
              <span className="text-4xl mt-3 text-white/50 font-light">$</span>
              <AnimatePresence mode='popLayout'>
                <motion.span 
                  key={basePrice}
                  initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: 20, filter: 'blur(10px)', position: 'absolute' }}
                  transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
                  className="text-[6rem] font-black tracking-tighter leading-none"
                >
                  {basePrice.toLocaleString()}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="space-y-4 mb-12 border-t border-white/10 pt-8">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Origin Transport</span>
                <span className="font-mono text-white/80">${(origin.price * vType.multiplier).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Ocean / Export Transit</span>
                <span className="font-mono text-white/80">${(dest.price * vType.multiplier).toLocaleString()}</span>
              </div>
            </div>

            <Magnetic>
              <button 
                onClick={() => {
                  document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group relative flex w-full h-16 items-center justify-center overflow-hidden rounded-full bg-white text-black font-bold"
              >
                <div className="absolute inset-0 bg-[#D4AF37] translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0" />
                <span className="relative z-10 transition-colors duration-500 group-hover:text-black">Request exact quote</span>
              </button>
            </Magnetic>
          </motion.div>

        </div>
      </div>
    </section>
  );
}