'use client';

import { motion } from 'framer-motion';

export default function AnimatedWorldMap() {
  // Approximate coordinates for the viewport 0 0 950 620
  // New coordinates adjusted for standard low-res wiki world map
  // USA (East Coast): ~250, 220
  // USA (West Coast): ~160, 220
  // Dubai: ~590, 280
  // Kabul: ~635, 255

  const nodes = [
    { id: 'USA', x: 230, y: 220, label: 'USA' },
    { id: 'Dubai', x: 590, y: 275, label: 'Dubai' }, 
    { id: 'Kabul', x: 635, y: 250, label: 'Afghanistan' }
  ];

  const paths = [
    // USA to Dubai
    { 
      path: "M 230 220 Q 410 120 590 275",
      delay: 0,
      duration: 3
    },
    // Dubai to Kabul
    {
      path: "M 590 275 Q 612 250 635 250",
      delay: 2.5,
      duration: 1.5
    }
  ];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* Map Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.12] dark:opacity-20">
        <div 
          className="w-full h-full max-w-[1400px] bg-no-repeat bg-center bg-contain" 
          style={{ 
            backgroundImage: "url('/world-map.svg')",
            filter: "var(--map-filter, invert(1) brightness(0.5))" // Standard inverted for dark backgrounds
          }} 
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 950 620"
          className="w-full h-full max-w-[1400px] object-contain object-center"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity="0" />
              <stop offset="25%" stopColor="var(--accent-gold)" stopOpacity="0.8" />
              <stop offset="75%" stopColor="var(--accent-gold)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity="0" />
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Paths */}
          {paths.map((p, i) => (
            <motion.path
              key={`path-${i}`}
              d={p.path}
              fill="none"
              stroke="url(#line-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#glow)"
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
          ))}

          {/* Dots */}
          {nodes.map((node, i) => (
            <g key={`node-${i}`}>
              {/* Core dot */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="3.5"
                fill="var(--accent-gold)"
                filter="url(#glow)"
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{
                  scale: [0.8, 1.3, 0.8],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5
                }}
              />
              {/* Radar pulse */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="4"
                fill="none"
                stroke="var(--accent-gold)"
                strokeWidth="1.5"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{
                  scale: 4.5,
                  opacity: 0,
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: i * 0.5
                }}
              />
              
              {/* Location Label */}
              <motion.text
                x={node.x}
                y={node.y - 12}
                fill="currentColor"
                className="text-[10px] font-semibold text-[var(--text-primary)] tracking-wider"
                textAnchor="middle"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 0.8, y: 0 }}
                transition={{ delay: i * 0.3 + 1, duration: 1 }}
              >
                {node.label}
              </motion.text>
            </g>
          ))}
        </svg>
      </div>

      {/* Fade masks for edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)] via-transparent to-[var(--background)] opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-transparent to-[var(--background)] opacity-80" />
      
      {/* Radial vignette mask */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,var(--background)_80%)]" />
    </div>
  );
}
