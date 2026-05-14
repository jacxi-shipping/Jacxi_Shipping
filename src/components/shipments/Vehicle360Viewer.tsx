'use client';

import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Pause,
  Play,
  RotateCw,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from 'react';
import { cn } from '@/lib/utils';

const AUTOPLAY_DELAY_MS = 120;
const DRAG_STEP_PX = 18;

type Vehicle360ViewerProps = {
  photos: string[];
  vehicleLabel: string;
  onOpenFrame?: (index: number) => void;
  className?: string;
};

function wrapIndex(index: number, total: number) {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

export default function Vehicle360Viewer({
  photos,
  vehicleLabel,
  onOpenFrame,
  className,
}: Vehicle360ViewerProps) {
  const frameCount = photos.length;
  const canSpin = frameCount > 1;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartIndexRef = useRef(0);

  useEffect(() => {
    if (frameCount === 0) {
      setActiveIndex(0);
      setIsPlaying(false);
      return;
    }

    setActiveIndex((currentIndex) => Math.min(currentIndex, frameCount - 1));

    if (!canSpin) {
      setIsPlaying(false);
    }
  }, [canSpin, frameCount]);

  useEffect(() => {
    if (!isPlaying || !canSpin) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => wrapIndex(currentIndex + 1, frameCount));
    }, AUTOPLAY_DELAY_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canSpin, frameCount, isPlaying]);

  if (frameCount === 0) {
    return null;
  }

  const currentPhoto = photos[activeIndex] ?? photos[0];

  const stepFrame = (direction: number) => {
    if (!canSpin) return;
    setIsPlaying(false);
    setActiveIndex((currentIndex) => wrapIndex(currentIndex + direction, frameCount));
  };

  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    setActiveIndex(Number(event.target.value));
  };

  const updateFrameFromPointer = (clientX: number) => {
    if (!canSpin || dragStartXRef.current === null) return;

    const dragOffset = clientX - dragStartXRef.current;
    const frameOffset = Math.trunc(dragOffset / DRAG_STEP_PX);

    setActiveIndex(wrapIndex(dragStartIndexRef.current + frameOffset, frameCount));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canSpin) return;

    setIsPlaying(false);
    setIsScrubbing(true);
    dragStartXRef.current = event.clientX;
    dragStartIndexRef.current = activeIndex;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    updateFrameFromPointer(event.clientX);
  };

  const finishScrub = (event: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;

    updateFrameFromPointer(event.clientX);
    dragStartXRef.current = null;
    setIsScrubbing(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      className={cn(
        'rounded-[28px] border border-[var(--border)] p-4 md:p-5',
        className,
      )}
      style={{
        background:
          'linear-gradient(140deg, rgba(212,175,55,0.12) 0%, rgba(var(--text-primary-rgb),0.03) 35%, rgba(15,23,42,0.08) 100%)',
      }}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
        <div className="space-y-4">
          <div
            className={cn(
              'group relative aspect-[16/10] overflow-hidden rounded-[24px] border border-white/10',
              canSpin ? 'cursor-ew-resize' : 'cursor-default',
            )}
            style={{
              background:
                'radial-gradient(circle at top, rgba(255,255,255,0.18), transparent 50%), linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.22))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishScrub}
            onPointerCancel={finishScrub}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(212,175,55,0.18), transparent 42%, rgba(15,23,42,0.14))',
              }}
            />
            <Image
              src={currentPhoto}
              alt={`${vehicleLabel} 360 frame ${activeIndex + 1}`}
              fill
              className="select-none object-contain p-4 md:p-6"
              draggable={false}
              priority
              unoptimized
            />

            <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white backdrop-blur-sm">
                360 View
              </span>
              <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                Frame {activeIndex + 1} / {frameCount}
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 text-white">
              <div>
                <p className="text-sm font-semibold">{vehicleLabel}</p>
                <p className="text-xs text-white/75">
                  {canSpin ? 'Drag sideways, tap frames, or autoplay the sequence.' : 'A single photo is available for this vehicle.'}
                </p>
              </div>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onOpenFrame?.(activeIndex)}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Open Frame
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-[20px] border border-[var(--border)] bg-[var(--panel)]/70 p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => stepFrame(-1)}
                disabled={!canSpin}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] transition hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous frame"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying((current) => !current)}
                disabled={!canSpin}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-gold)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? 'Pause' : 'Auto Spin'}
              </button>
              <button
                type="button"
                onClick={() => stepFrame(1)}
                disabled={!canSpin}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] transition hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next frame"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="ml-auto rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
                {canSpin ? (isScrubbing ? 'Scrubbing sequence' : 'Drag to rotate') : 'More angles create a smoother 360 spin'}
              </span>
            </div>

            {canSpin && (
              <input
                type="range"
                min={0}
                max={frameCount - 1}
                step={1}
                value={activeIndex}
                onChange={handleSliderChange}
                className="h-2 w-full cursor-pointer accent-[var(--accent-gold)]"
                aria-label="Vehicle 360 frame slider"
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--panel)]/80 p-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-secondary)]">
              Sequence Viewer
            </p>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Inspect the vehicle from every uploaded angle
            </h3>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              This 360 preview uses the vehicle images in their current upload order. Even spacing around the car produces the smoothest spin.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Frames
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{frameCount}</p>
              <p className="text-xs text-[var(--text-secondary)]">Uploaded sequence</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Playback
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                {isPlaying ? 'Auto' : 'Manual'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {canSpin ? 'Switch anytime' : 'Needs 2+ frames'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Frame Strip
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveIndex(0);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo, index) => {
                const isActive = index === activeIndex;

                return (
                  <button
                    key={`${photo}-${index}`}
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveIndex(index);
                    }}
                    className={cn(
                      'relative h-20 w-16 shrink-0 overflow-hidden rounded-2xl border transition',
                      isActive
                        ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/25'
                        : 'border-[var(--border)] hover:border-[var(--accent-gold)]/50',
                    )}
                    aria-label={`Go to frame ${index + 1}`}
                  >
                    <Image
                      src={photo}
                      alt={`${vehicleLabel} frame ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                      unoptimized
                    />
                    <span className="absolute bottom-1 left-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}