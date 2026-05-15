'use client';

import { motion } from 'framer-motion';

interface TrackingRouteMapProps {
  progressPercent: number; // 0 to 100
  origin: string;
  destination: string;
}

export default function TrackingRouteMap({ progressPercent, origin, destination }: TrackingRouteMapProps) {
  // Approximate coordinate anchors for USA -> Mersin -> Herat
  const nodes = [
    { id: 'USA', x: 230, y: 220, label: 'USA (Origin)' },
    { id: 'Mersin', x: 555, y: 230, label: 'Mersin (Transit)' }, 
    { id: 'Herat', x: 620, y: 245, label: 'Herat (Destination)' }
  ];

  // Route paths segments
  const segments = [
    { 
      path: "M 230 220 Q 400 130 555 230", // Ship path
      type: 'ship',
      percentStart: 0,
      percentEnd: 60 // Let's say ocean transit is 0-60% of the overall journey
    },
    {
      path: "M 555 230 Q 580 220 620 245", // Truck path
      type: 'truck',
      percentStart: 60,
      percentEnd: 100
    }
  ];

  const currentSegmentIndex = progressPercent >= 60 ? 1 : 0;
  
  // Calculate relative progress in the current segment
  const currentSegment = segments[currentSegmentIndex];
  const relativeSegmentProgress = Math.max(0, Math.min(100, 
    ((progressPercent - currentSegment.percentStart) / (currentSegment.percentEnd - currentSegment.percentStart)) * 100
  ));

  return (
    <div className="relative w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden aspect-[16/9] md:aspect-[21/9]">
        
      {/* Map Background SVG Image */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 mix-blend-screen">
        <div 
          className="w-full h-full max-w-[1200px] bg-no-repeat bg-center bg-contain" 
          style={{ backgroundImage: "url('/world-map.svg')", filter: "invert(1) brightness(0.6)" }} 
        />
      </div>

      <svg
        viewBox="0 0 950 620"
        className="absolute inset-0 w-full h-full object-contain object-center scale-110 sm:scale-100"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="tracking-line-completed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity="1" />
          </linearGradient>
          
          <filter id="tracking-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Draw Full Background Path (Ghost Mode) */}
        {segments.map((seg, i) => (
            <path
              key={`track-ghost-${i}`}
              d={seg.path}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
        ))}

        {/* Draw Completed Paths */}
        {segments.map((seg, i) => {
          let drawPercent = 0;
          if (progressPercent >= seg.percentEnd) {
             drawPercent = 1; // fully drawn
          } else if (progressPercent > seg.percentStart) {
             drawPercent = relativeSegmentProgress / 100; // partial
          }

          if (drawPercent === 0) return null;

          return (
            <g key={`track-fill-${i}`}>
              <motion.path
                d={seg.path}
                fill="none"
                stroke="url(#tracking-line-completed)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#tracking-glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: drawPercent }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </g>
          );
        })}

        {/* Active Moving Vehicle SVG based on Progress */}
        <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, motionDistance: `${relativeSegmentProgress}%` }}
            transition={{ duration: 2, ease: "easeOut" }}
            style={{ offsetPath: `path('${currentSegment.path}')` } as any}
        >
            {/* The active location pulse */}
            <circle cx="0" cy="0" r="16" fill="var(--accent-gold)" opacity="0.3" filter="url(#tracking-glow)" />
            <circle cx="0" cy="0" r="8" fill="var(--accent-gold)" />

            {/* Vehicle Icon */}
            {currentSegment.type === 'ship' ? (
                // Cargo Ship SVG
                <g transform="translate(-16, -16) scale(0.9)">
                   <path 
                    d="M32 18H29V14C29 12.8954 28.1046 12 27 12H13C11.8954 12 11 12.8954 11 14V18H8C6.67157 18 5.43432 18.7369 4.81977 19.897L2.1795 24.8841C1.94248 25.3318 2.26873 25.8696 2.77663 25.8696H37.2234C37.7313 25.8696 38.0575 25.3318 37.8205 24.8841L35.1802 19.897C34.5657 18.7369 33.3284 18 32 18Z" 
                    fill="#1e293b"
                    stroke="white"
                    strokeWidth="1.5"
                   />
                </g>
            ) : (
                // Truck SVG
                <g transform="translate(-16, -16) scale(0.8)">
                   <path 
                     d="M8 10H24V26H8V10ZM24 14H30C32.2091 14 34 15.7909 34 18V26H24V14ZM6 26C6 28.2091 7.79086 30 10 30C12.2091 30 14 28.2091 14 26H26C26 28.2091 27.7909 30 30 30C32.2091 30 34 28.2091 34 26H38V22H34V18H38V14H36C36 10.6863 33.3137 8 30 8H22C22 5.79086 20.2091 4 18 4H10C7.79086 4 6 5.79086 6 8V26Z" 
                     fill="#1e293b"
                     stroke="white"
                     strokeWidth="1.5"
                   />
                </g>
            )}
        </motion.g>

        {/* Map Nodes */}
        {nodes.map((node, i) => {
           // Decide if node is reached based on progress
           const isReached = 
              (i === 0) || 
              (i === 1 && progressPercent >= 60) || 
              (i === 2 && progressPercent >= 100);

           return (
            <g key={`track-node-${i}`}>
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={isReached ? "6" : "4"}
                fill={isReached ? "var(--accent-gold)" : "#64748b"}
                stroke="#1e293b"
                strokeWidth="2"
              />
              <motion.text
                x={node.x}
                y={node.y - 12}
                fill={isReached ? "#FFFFFF" : "#94a3b8"}
                className="text-xs font-bold tracking-wider"
                textAnchor="middle"
              >
                {node.label}
              </motion.text>
            </g>
          );
        })}
      </svg>
      {/* Vignette edge blending */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(15,23,42,0.8)_100%)] pointer-events-none" />
    </div>
  );
}
