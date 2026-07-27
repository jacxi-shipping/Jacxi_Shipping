'use client';

import { ReactLenis } from 'lenis/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function SmoothScrolling({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<any>(null);

  // Reset scroll on route change
  useEffect(() => {
    if (lenisRef.current?.lenis) {
      lenisRef.current.lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  return (
    <ReactLenis 
      root 
      ref={lenisRef}
      options={{ 
        lerp: 0.1, 
        duration: 1.2, 
        smoothWheel: true,
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        syncTouch: false,
        touchMultiplier: 2,
      }}
    >
      {children}
    </ReactLenis>
  );
}
