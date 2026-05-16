'use client';

import { motion } from 'framer-motion';
import { MapPin, Ship, Truck, CheckCircle } from 'lucide-react';

const journeySteps = [
  {
    step: 1,
    icon: MapPin,
    location: 'United States',
    title: 'Pickup & Loading',
    description: 'We collect your vehicle, inspect it, and safely load it at the port.',
    duration: '1-3 days',
  },
  {
    step: 2,
    icon: Ship,
    location: 'Ocean Transit',
    title: 'USA to Mersin',
    description: 'Secure ocean freight to the port of Mersin, Turkey.',
    duration: '18-24 days',
  },
  {
    step: 3,
    icon: Truck,
    location: 'Land Transport',
    title: 'Mersin to Herat',
    description: 'Overland transport traversing through Turkey and Iran to Herat, Afghanistan.',
    duration: '10-14 days',
  },
  {
    step: 4,
    icon: CheckCircle,
    location: 'Herat, Afghanistan',
    title: 'Customs & Delivery',
    description: 'Final customs clearance and safe door-to-door delivery.',
    duration: '2-4 days',
  },
];

export default function RoutesAnimatedSection() {
  const nodes = [
    { id: 'USA', x: 230, y: 220, label: 'USA Port' },
    { id: 'Mersin', x: 555, y: 230, label: 'Mersin Port' }, 
    { id: 'Herat', x: 620, y: 245, label: 'Herat' }
  ];

  const paths = [
    // USA to Mersin (Ship)
    { 
      path: "M 230 220 Q 400 130 555 230",
      delay: 0,
      duration: 4,
      type: 'ship'
    },
    // Mersin to Herat (Truck)
    {
      path: "M 555 230 Q 580 220 620 245",
      delay: 3,
      duration: 2,
      type: 'truck'
    }
  ];

  return (
    <section className="relative bg-white py-24 sm:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
            Our Shipping Route
          </h2>
          <p className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            USA to Herat via Mersin
          </p>
          <p className="mt-4 text-lg text-gray-600">
            A faster, safer, and highly transparent route ensuring your vehicle arrives securely to its destination.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-[var(--text-primary)] text-white px-6 py-3 rounded-xl shadow-lg border border-[var(--text-secondary)]">
            <span className="font-semibold text-sm">Total Estimated Time: 30-45 Days</span>
          </div>
        </div>

        {/* Map Animation Container */}
        <div className="relative w-full rounded-[2.5rem] bg-slate-900 overflow-hidden shadow-2xl border-4 border-white ring-1 ring-black/5 mb-16 aspect-[16/9] md:aspect-[21/9]">
          
          {/* Map Base Image */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 mix-blend-screen">
            <div 
              className="w-full h-full max-w-[1200px] bg-no-repeat bg-center bg-contain" 
              style={{ backgroundImage: "url('/world-map.svg')", filter: "invert(1) brightness(0.7)" }} 
            />
          </div>

          <svg
            viewBox="0 0 950 620"
            className="absolute inset-0 w-full h-full object-contain object-center scale-110 sm:scale-100"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="route-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity="0.2" />
                <stop offset="50%" stopColor="var(--accent-gold)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity="0.2" />
              </linearGradient>
              
              <filter id="route-glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Static Ghost Paths */}
            {paths.map((p, i) => (
               <path
                  key={`ghost-path-${i}`}
                  d={p.path}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
               />
            ))}

            {/* Animated Paths and Vehicles */}
            {paths.map((p, i) => (
              <g key={`route-path-${i}`}>
                <motion.path
                  d={p.path}
                  fill="none"
                  stroke="url(#route-line-gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="url(#route-glow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ 
                    pathLength: [0, 1, 1],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: p.duration * 2,
                    delay: p.delay,
                    repeat: Infinity,
                    ease: "easeOut",
                    repeatDelay: 1
                  }}
                />
                
                {/* Vehicle SVG moving along the path */}
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    offsetDistance: ["0%", "100%", "100%", "100%"]
                  }}
                  transition={{
                    duration: p.duration * 2,
                    delay: p.delay,
                    repeat: Infinity,
                    ease: "easeOut",
                    repeatDelay: 1
                  }}
                  style={{ offsetPath: `path('${p.path}')` } as any}
                >
                  {p.type === 'ship' ? (
                    // Cargo Ship SVG
                    <g transform="translate(-15, -15) scale(0.8)">
                      <path 
                        d="M32 18H29V14C29 12.8954 28.1046 12 27 12H13C11.8954 12 11 12.8954 11 14V18H8C6.67157 18 5.43432 18.7369 4.81977 19.897L2.1795 24.8841C1.94248 25.3318 2.26873 25.8696 2.77663 25.8696H37.2234C37.7313 25.8696 38.0575 25.3318 37.8205 24.8841L35.1802 19.897C34.5657 18.7369 33.3284 18 32 18Z" 
                        fill="var(--accent-gold)"
                        filter="url(#route-glow)"
                      />
                    </g>
                  ) : (
                    // Truck SVG
                    <g transform="translate(-15, -15) scale(0.7)">
                      <path 
                        d="M8 10H24V26H8V10ZM24 14H30C32.2091 14 34 15.7909 34 18V26H24V14ZM6 26C6 28.2091 7.79086 30 10 30C12.2091 30 14 28.2091 14 26H26C26 28.2091 27.7909 30 30 30C32.2091 30 34 28.2091 34 26H38V22H34V18H38V14H36C36 10.6863 33.3137 8 30 8H22C22 5.79086 20.2091 4 18 4H10C7.79086 4 6 5.79086 6 8V26Z" 
                        fill="var(--accent-gold)"
                        filter="url(#route-glow)"
                      />
                    </g>
                  )}
                </motion.g>
              </g>
            ))}

            {/* Map Nodes */}
            {nodes.map((node, i) => (
              <g key={`route-node-${i}`}>
                {/* Node Pin */}
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r="5"
                  fill="#FFF"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", delay: 0.5 + i * 0.2 }}
                />
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r="9"
                  fill="none"
                  stroke="var(--accent-gold)"
                  strokeWidth="2"
                  filter="url(#route-glow)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 2.5], opacity: [1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                />
                {/* Text Label */}
                <motion.text
                  x={node.x}
                  y={node.y - 15}
                  fill="#FFFFFF"
                  className="text-xs font-bold tracking-wider"
                  textAnchor="middle"
                  initial={{ opacity: 0, y: 5 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 + i * 0.2 }}
                >
                  {node.label}
                </motion.text>
              </g>
            ))}
          </svg>

          {/* Vignette edges */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-transparent to-slate-900/80 pointer-events-none" />
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Animated Connectors behind the cards */}
          <div className="hidden lg:block absolute top-[4rem] left-1/2 -ml-[45%] w-[90%] h-1 border-t-2 border-dashed border-gray-200 z-0 opacity-50" />

          {journeySteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div 
                key={index} 
                className="relative z-10 w-full"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Icon Container */}
                <div className="mb-4 relative">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center justify-center text-gray-900 mx-auto transition-transform hover:-translate-y-1">
                    <Icon className="w-8 h-8" />
                  </div>
                  {/* Step Badge */}
                  <div className="absolute -top-2 right-1/2 translate-x-8 w-6 h-6 rounded-full bg-[var(--text-primary)] text-white flex items-center justify-center text-[10px] font-bold shadow-md">
                    {step.step}
                  </div>
                </div>

                <div className="text-center bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all h-full">
                  <div className="inline-block px-3 py-1 mb-3 bg-[var(--text-primary)]/5 text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-wider rounded-full">
                    {step.location}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 h-[40px]">
                    {step.description}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-gold)]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {step.duration}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}