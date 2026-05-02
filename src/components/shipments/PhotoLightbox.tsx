'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoLightboxProps {
  images: string[];
  index: number;
  title?: string;
  /** Whether to show the delete button */
  canDelete?: boolean;
  /** Called when the user closes the lightbox */
  onClose: () => void;
  /** Called when navigating — returns the new index */
  onNavigate: (index: number) => void;
  /** Called when user taps Delete — passes index */
  onDelete?: (index: number) => Promise<void>;
  /** Called when user taps Download */
  onDownload?: (url: string, index: number) => Promise<void>;
  downloading?: boolean;
}

const ZOOM_STEP = 0.3;
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

export default function PhotoLightbox({
  images,
  index,
  title,
  canDelete = false,
  onClose,
  onNavigate,
  onDelete,
  onDownload,
  downloading = false,
}: PhotoLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [deleting, setDeleting] = useState(false);

  // Swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Direction state for slide animation
  const [direction, setDirection] = useState<1 | -1>(1);
  const [imageKey, setImageKey] = useState(index);

  // Reset zoom/pan when index changes
  useEffect(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setImageKey(index);
  }, [index]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const navigate = useCallback((dir: 1 | -1) => {
    if (images.length <= 1) return;
    setDirection(dir);
    const next = (index + dir + images.length) % images.length;
    onNavigate(next);
  }, [index, images.length, onNavigate]);

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': navigate(-1); break;
        case 'ArrowRight': navigate(1); break;
        case '+': case '=': setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX)); break;
        case '-': case '_': setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN)); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onClose]);

  // Scroll-to-zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (zoom === 1 && e.deltaY === 0) return;
    e.preventDefault();
    setZoom(z => {
      const next = z - e.deltaY * 0.001;
      return Math.min(Math.max(next, ZOOM_MIN), ZOOM_MAX);
    });
  }, [zoom]);

  const handleDoubleClick = useCallback(() => {
    setZoom(z => {
      const next = z > 1 ? 1 : 2;
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoom === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Only trigger swipe if horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      navigate(dx < 0 ? 1 : -1);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(index);
    } finally {
      setDeleting(false);
    }
  };

  const current = images[index];

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
  };

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox-backdrop"
        className="fixed inset-0 z-[9999] flex flex-col bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* ── Floating Copart-style Header ── */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between px-4 pt-4 sm:px-6">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-md border border-white/20 bg-black/65 px-2.5 py-1.5 backdrop-blur-md">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/75">Image</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-bold text-white">{index + 1}</span>
            <span className="text-[11px] text-white/50">of</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-bold text-white">{images.length}</span>
            {title && (
              <span className="ml-1 max-w-[180px] truncate text-[10px] font-semibold uppercase tracking-widest text-white/45">
                {title}
              </span>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            {onDownload && (
              <button
                type="button"
                onClick={() => void onDownload(current, index)}
                disabled={downloading}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/65 text-white shadow-lg backdrop-blur-md transition-all hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] disabled:opacity-50"
                aria-label="Download photo"
              >
                {downloading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-red-400/40 bg-red-500/20 text-red-200 shadow-lg backdrop-blur-md transition-all hover:bg-red-500/30 disabled:opacity-50"
                aria-label="Delete photo"
              >
                {deleting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/65 text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/15"
              aria-label="Close viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Main image area ── */}
        <div
          className="relative flex-1 overflow-hidden px-3 pb-3 pt-2 sm:px-8 sm:pb-6"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={imageKey}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
            >
              <motion.div
                animate={{ scale: zoom, x: panOffset.x, y: panOffset.y }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                drag={zoom > 1}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  setPanOffset(prev => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }));
                }}
                className="relative h-[min(82vh,980px)] w-[min(95vw,1600px)] overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-b from-white/5 to-white/[0.02] shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
                style={{ touchAction: 'none' }}
              >
                <Image
                  src={current}
                  alt={`${title ? title + ' — ' : ''}Photo ${index + 1}`}
                  fill
                  className="object-contain p-2 sm:p-3"
                  unoptimized
                  priority
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute left-4 top-1/2 z-30 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-gradient-to-b from-black/75 to-black/45 text-white shadow-[0_10px_26px_rgba(0,0,0,0.55)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] sm:left-7 sm:h-14 sm:w-14"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="absolute right-4 top-1/2 z-30 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-gradient-to-b from-black/75 to-black/45 text-white shadow-[0_10px_26px_rgba(0,0,0,0.55)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] sm:right-7 sm:h-14 sm:w-14"
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
            </>
          )}
        </div>

        {/* ── Bottom Thumbnail Rail (Copart-style) ── */}
        {images.length > 1 && (
          <div className="relative z-20 border-t border-white/10 bg-black/70 backdrop-blur-sm">
            <div className="overflow-x-auto py-3">
              <div className="flex min-w-max items-center gap-2 px-4 sm:gap-2.5 sm:px-6">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDirection(i > index ? 1 : -1);
                      onNavigate(i);
                    }}
                    className={cn(
                      'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border transition-all duration-200 sm:h-[72px] sm:w-[72px]',
                      i === index
                        ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/50'
                        : 'border-white/25 opacity-70 hover:opacity-100 hover:border-white/60'
                    )}
                    aria-label={`Go to photo ${i + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`Thumbnail ${i + 1}`}
                      fill
                      className="object-cover"
                      loading="lazy"
                      unoptimized
                    />
                    <span className={cn(
                      'absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                      i === index ? 'bg-[var(--accent-gold)] text-black' : 'bg-black/70 text-white/90'
                    )}>
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
