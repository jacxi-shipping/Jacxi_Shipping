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
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      >
        {/* ── Inner container — stops click-to-close propagating from header/strip ── */}
        <div className="flex h-full flex-col" onClick={e => e.stopPropagation()}>

          {/* ── Header bar — system design ── */}
          <div className="z-40 flex items-center justify-between border-b border-[var(--border)] bg-[var(--panel)] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              {title && (
                <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
              )}
              <span className="rounded-full bg-[var(--background)] border border-[var(--border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                {index + 1} / {images.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onDownload && (
                <button
                  type="button"
                  onClick={() => void onDownload(current, index)}
                  disabled={downloading}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] disabled:opacity-50"
                  aria-label="Download photo"
                >
                  {downloading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
                  aria-label="Delete photo"
                >
                  {deleting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] transition-all hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
                aria-label="Close viewer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ── Main image area ── */}
          <div
            className="relative flex-1 overflow-hidden bg-[#111]"
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
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
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
                  className="relative h-full w-full overflow-hidden rounded-xl"
                  style={{ touchAction: 'none' }}
                >
                  <Image
                    src={current}
                    alt={`${title ? title + ' — ' : ''}Photo ${index + 1}`}
                    fill
                    className="object-contain"
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
                  className="absolute left-3 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] sm:h-12 sm:w-12"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-7 sm:w-7" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(1)}
                  className="absolute right-3 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] sm:h-12 sm:w-12"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-5 w-5 sm:h-7 sm:w-7" />
                </button>
              </>
            )}
          </div>

          {/* ── Thumbnail strip — system design ── */}
          {images.length > 1 && (
            <div className="z-20 border-t border-[var(--border)] bg-[var(--panel)] py-3">
              <div className="overflow-x-auto">
                <div className="flex min-w-max items-center gap-2 px-4 sm:px-6">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setDirection(i > index ? 1 : -1);
                        onNavigate(i);
                      }}
                      className={cn(
                        'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150 sm:h-[72px] sm:w-[72px]',
                        i === index
                          ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/30'
                          : 'border-[var(--border)] opacity-75 hover:opacity-100 hover:border-[var(--accent-gold)]/50'
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
                        i === index ? 'bg-[var(--accent-gold)] text-black' : 'bg-black/60 text-white'
                      )}>
                        {i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
