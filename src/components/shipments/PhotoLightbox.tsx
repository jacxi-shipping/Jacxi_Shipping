'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
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
        {/* ── Top Bar ── */}
        <div className="relative z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 py-3 sm:px-6">
          <div className="flex-1 min-w-0">
            {title && (
              <p className="truncate text-xs font-semibold uppercase tracking-widest text-white/50">{title}</p>
            )}
            <p className="mt-0.5 text-sm font-bold text-white">
              {index + 1}
              <span className="ml-1 text-white/40">/ {images.length}</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                type="button"
                onClick={() => void onDownload(current, index)}
                disabled={downloading}
                className="rounded-full bg-white/10 p-2 text-white transition-all hover:bg-white/20 disabled:opacity-50"
                aria-label="Download photo"
              >
                {downloading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
                className="rounded-full bg-[var(--error)]/80 p-2 text-white transition-all hover:bg-[var(--error)] disabled:opacity-50"
                aria-label="Delete photo"
              >
                {deleting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 p-2 text-white transition-all hover:bg-white/20"
              aria-label="Close viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Main image area ── */}
        <div
          className="relative flex-1 overflow-hidden"
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
                className="relative h-full w-full"
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
                className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-2.5 text-white shadow-xl transition-all duration-200 hover:scale-110 hover:border-white/40 hover:bg-black/80 sm:left-4 sm:p-3.5"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-5 w-5 sm:h-7 sm:w-7" />
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-2.5 text-white shadow-xl transition-all duration-200 hover:scale-110 hover:border-white/40 hover:bg-black/80 sm:right-4 sm:p-3.5"
                aria-label="Next photo"
              >
                <ChevronRight className="h-5 w-5 sm:h-7 sm:w-7" />
              </button>
            </>
          )}
        </div>

        {/* ── Bottom Bar ── */}
        <div className="relative z-20 bg-gradient-to-t from-black/80 to-transparent">
          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN))}
              disabled={zoom <= ZOOM_MIN}
              className="rounded-lg bg-white/10 p-1.5 text-white transition-all hover:bg-white/20 disabled:opacity-30"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="min-w-[52px] rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white transition-all hover:bg-white/20"
              aria-label="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX))}
              disabled={zoom >= ZOOM_MAX}
              className="rounded-lg bg-white/10 p-1.5 text-white transition-all hover:bg-white/20 disabled:opacity-30"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="overflow-x-auto pb-4 pt-2">
              <div className="flex gap-2 px-4">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDirection(i > index ? 1 : -1);
                      onNavigate(i);
                    }}
                    className={cn(
                      'relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200',
                      i === index
                        ? 'scale-110 border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]/50'
                        : 'border-white/20 opacity-50 hover:opacity-80 hover:border-white/50'
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
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
