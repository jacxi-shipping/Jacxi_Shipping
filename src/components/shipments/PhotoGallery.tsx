'use client';

import Image from 'next/image';
import { Upload, Plus, Download, ChevronLeft, ChevronRight, ZoomIn, Package } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface PhotoGalleryItem {
  url: string;
  label?: string;
}

interface UploadProgress {
  name: string;
  progress: number;
}

interface PhotoGalleryProps {
  photos: PhotoGalleryItem[];
  onPhotoClick: (index: number) => void;
  canUpload?: boolean;
  onUpload?: (files: File[]) => Promise<void>;
  onDelete?: (index: number) => Promise<void>;
  uploadProgress?: UploadProgress[];
  uploading?: boolean;
  uploadLabel?: string;
  onDownloadSingle?: (url: string, index: number) => Promise<void>;
  onDownloadAll?: (urls: string[]) => Promise<void>;
  className?: string;
}

export default function PhotoGallery({
  photos,
  onPhotoClick,
  canUpload = false,
  onUpload,
  onDelete,
  uploadProgress = [],
  uploading = false,
  uploadLabel,
  onDownloadSingle,
  onDownloadAll,
  className,
}: PhotoGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const thumbStripRef = useRef<HTMLDivElement>(null);

  const clampedIndex = photos.length > 0 ? Math.min(activeIndex, photos.length - 1) : 0;
  const currentPhoto = photos[clampedIndex];

  const scrollThumbIntoView = useCallback((idx: number) => {
    const strip = thumbStripRef.current;
    if (!strip) return;
    const thumb = strip.children[idx] as HTMLElement | undefined;
    if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, []);

  const goTo = useCallback((idx: number) => {
    const next = Math.max(0, Math.min(idx, photos.length - 1));
    setActiveIndex(next);
    scrollThumbIntoView(next);
  }, [photos.length, scrollThumbIntoView]);

  const goPrev = useCallback(() => {
    if (photos.length <= 1) return;
    const next = (clampedIndex - 1 + photos.length) % photos.length;
    setActiveIndex(next);
    scrollThumbIntoView(next);
  }, [clampedIndex, photos.length, scrollThumbIntoView]);

  const goNext = useCallback(() => {
    if (photos.length <= 1) return;
    const next = (clampedIndex + 1) % photos.length;
    setActiveIndex(next);
    scrollThumbIntoView(next);
  }, [clampedIndex, photos.length, scrollThumbIntoView]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !onUpload) return;
    await onUpload(Array.from(files));
  }, [onUpload]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    await handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDelete = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (!onDelete || deletingIndex !== null) return;
    setDeletingIndex(index);
    try {
      await onDelete(index);
      if (index === clampedIndex && clampedIndex > 0) setActiveIndex(clampedIndex - 1);
    } finally {
      setDeletingIndex(null);
    }
  };

  const handleDownloadSingleClick = async (e: React.MouseEvent, url: string, index: number) => {
    e.stopPropagation();
    if (!onDownloadSingle || downloadingIndex !== null) return;
    setDownloadingIndex(index);
    try {
      await onDownloadSingle(url, index);
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleDownloadAllClick = async () => {
    if (!onDownloadAll || downloadingAll) return;
    setDownloadingAll(true);
    try {
      await onDownloadAll(photos.map(p => p.url));
    } finally {
      setDownloadingAll(false);
    }
  };

  const hasPhotos = photos.length > 0;

  if (!hasPhotos && !canUpload) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Package className="mb-3 h-10 w-10 text-[var(--text-secondary)]/40" />
        <p className="text-sm text-[var(--text-secondary)]">No photos available yet.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>

      {/* Upload area */}
      {canUpload && onUpload && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'relative flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200',
            dragging
              ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 scale-[1.01]'
              : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)]/70 hover:bg-[var(--accent-gold)]/5',
            uploading && 'pointer-events-none opacity-60'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => void handleFiles(e.target.files).then(() => { e.target.value = ''; })}
            className="hidden"
            disabled={uploading}
          />
          <div className="flex flex-col items-center gap-1">
            {uploading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-gold)] border-t-transparent" />
            ) : (
              <div className="flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-[var(--accent-gold)]" />
                <Upload className="h-4 w-4 text-[var(--accent-gold)]" />
              </div>
            )}
            <p className="text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--accent-gold)]">{uploadLabel || 'Add Photos'}</span>
              {' — drag & drop or click'}
            </p>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-1.5">
          {uploadProgress.map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-[var(--text-primary)]">{item.name}</p>
                {item.progress >= 0 ? (
                  <div className="mt-1 h-1 w-full rounded-full bg-[var(--border)]">
                    <div className="h-1 rounded-full bg-[var(--accent-gold)] transition-all duration-300" style={{ width: `${item.progress}%` }} />
                  </div>
                ) : (
                  <p className="text-xs text-[var(--error)]">Upload failed</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-[var(--text-secondary)]">
                {item.progress >= 0 ? (item.progress === 100 ? '✓' : `${item.progress}%`) : '✗'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Copart-style Viewer */}
      {hasPhotos && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#0f1114]">

          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-white/10 bg-black/70 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/80">Image</span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-white">{clampedIndex + 1}</span>
              <span className="text-xs text-white/50">of</span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-white">{photos.length}</span>
              {currentPhoto?.label && (
                <span className="ml-1 rounded-full bg-[var(--accent-gold)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent-gold)]">
                  {currentPhoto.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onDownloadSingle && currentPhoto && (
                <button
                  type="button"
                  onClick={(e) => void handleDownloadSingleClick(e, currentPhoto.url, clampedIndex)}
                  disabled={downloadingIndex === clampedIndex}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] disabled:opacity-50"
                >
                  {downloadingIndex === clampedIndex ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Save Photo
                </button>
              )}
              {onDownloadAll && photos.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleDownloadAllClick()}
                  disabled={downloadingAll}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-black transition-all hover:brightness-110 disabled:opacity-60"
                >
                  {downloadingAll ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download All ({photos.length})
                </button>
              )}
            </div>
          </div>

          {/* Main image — 16:9 */}
          <div className="relative bg-black p-2 sm:p-3" style={{ aspectRatio: '16/9' }}>
            {currentPhoto && (
              <>
                <div className="relative h-full w-full overflow-hidden rounded-lg border border-white/15 bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                  <Image
                    key={currentPhoto.url}
                    src={currentPhoto.url}
                    alt={`Photo ${clampedIndex + 1}${currentPhoto.label ? ` — ${currentPhoto.label}` : ''}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 80vw"
                    priority
                    unoptimized
                  />
                </div>

                {/* Full-view button */}
                <button
                  type="button"
                  onClick={() => onPhotoClick(clampedIndex)}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/60 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm transition-all hover:bg-black/80"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                  Full View
                </button>

                {/* Delete on main image */}
                {canUpload && onDelete && (
                  <button
                    type="button"
                    onClick={(e) => void handleDelete(e, clampedIndex)}
                    disabled={deletingIndex !== null}
                    className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-[var(--error)]/90 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm transition-all hover:bg-[var(--error)] disabled:opacity-50"
                  >
                    {deletingIndex === clampedIndex ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Delete
                  </button>
                )}

                {/* Prev / Next arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-gradient-to-b from-black/70 to-black/45 text-white shadow-[0_8px_18px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/35 disabled:shadow-none disabled:hover:scale-100"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-gradient-to-b from-black/70 to-black/45 text-white shadow-[0_8px_18px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/35 disabled:shadow-none disabled:hover:scale-100"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div
              ref={thumbStripRef}
              className="flex gap-2 overflow-x-auto border-t border-white/10 bg-black/65 p-2.5"
              style={{ scrollbarWidth: 'thin' }}
            >
              {photos.map((photo, i) => (
                <div key={i} className="group relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    className={cn(
                      'relative h-16 w-16 overflow-hidden rounded-md border transition-all duration-150 sm:h-[72px] sm:w-[72px]',
                      i === clampedIndex
                        ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/50'
                        : 'border-white/25 opacity-70 hover:opacity-100 hover:border-white/55'
                    )}
                    aria-label={`Go to photo ${i + 1}`}
                    aria-current={i === clampedIndex ? 'true' : undefined}
                  >
                    <Image
                      src={photo.url}
                      alt={`Thumbnail ${i + 1}`}
                      fill
                      className="object-cover"
                      loading="lazy"
                      unoptimized
                    />
                    <span className={cn(
                      'absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                      i === clampedIndex ? 'bg-[var(--accent-gold)] text-black' : 'bg-black/70 text-white/90'
                    )}>
                      {i + 1}
                    </span>
                  </button>
                  {onDownloadSingle && (
                    <button
                      type="button"
                      onClick={(e) => void handleDownloadSingleClick(e, photo.url, i)}
                      disabled={downloadingIndex === i}
                      className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-gold)] text-black shadow-md opacity-0 transition-all group-hover:opacity-100 disabled:opacity-50"
                      aria-label={`Download photo ${i + 1}`}
                    >
                      {downloadingIndex === i ? (
                        <div className="h-2.5 w-2.5 animate-spin rounded-full border border-black border-t-transparent" />
                      ) : (
                        <Download className="h-2.5 w-2.5" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
