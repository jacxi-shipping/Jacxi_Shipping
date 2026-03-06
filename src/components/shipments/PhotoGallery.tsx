'use client';

import Image from 'next/image';
import { Upload, Plus } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface PhotoGalleryItem {
  url: string;
  label?: string;
}

interface UploadProgress {
  name: string;
  progress: number; // 0-100 or -1 for error
}

interface PhotoGalleryProps {
  /** All photos to display */
  photos: PhotoGalleryItem[];
  /** Called when user clicks a photo — passes the flat index */
  onPhotoClick: (index: number) => void;
  /** Whether to show the upload area / delete buttons */
  canUpload?: boolean;
  /** Called after user selects files */
  onUpload?: (files: File[]) => Promise<void>;
  /** Called when user deletes a photo by index */
  onDelete?: (index: number) => Promise<void>;
  /** Upload progress items to display */
  uploadProgress?: UploadProgress[];
  /** Set to true while an upload is running */
  uploading?: boolean;
  /** Optional label shown above the upload area */
  uploadLabel?: string;
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
  className,
}: PhotoGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !onUpload) return;
      await onUpload(Array.from(files));
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      await handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDelete = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (!onDelete || deletingIndex !== null) return;
    setDeletingIndex(index);
    try {
      await onDelete(index);
    } finally {
      setDeletingIndex(null);
    }
  };

  const hasPhotos = photos.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload area — always shown when canUpload */}
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
            'relative flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200',
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
          <div className="flex flex-col items-center gap-1.5">
            {uploading ? (
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent-gold)] border-t-transparent" />
            ) : (
              <div className="flex items-center gap-1.5">
                <Plus className="h-5 w-5 text-[var(--accent-gold)]" />
                <Upload className="h-5 w-5 text-[var(--accent-gold)]" />
              </div>
            )}
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--accent-gold)]">
                {uploadLabel || 'Add Photos'}
              </span>
              {' '}— drag & drop or click
            </p>
            <p className="text-xs text-[var(--text-secondary)]/70">PNG · JPG · WEBP · max 5 MB each</p>
          </div>
        </div>
      )}

      {/* Per-file upload progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-1.5">
          {uploadProgress.map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-[var(--text-primary)]">{item.name}</p>
                {item.progress >= 0 ? (
                  <div className="mt-1 h-1 w-full rounded-full bg-[var(--border)]">
                    <div
                      className="h-1 rounded-full bg-[var(--accent-gold)] transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
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

      {/* Photo grid */}
      {hasPhotos ? (
        <div
          className={cn(
            'grid gap-1.5',
            // 2 cols on small, 3 on medium, 4 on large, up to 6 on xl
            'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          )}
        >
          {photos.map((photo, index) => (
            <button
              key={index}
              type="button"
              className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
              onClick={() => onPhotoClick(index)}
              aria-label={`View photo ${index + 1}${photo.label ? ` — ${photo.label}` : ''}`}
            >
              {/* Thumbnail */}
              <Image
                src={photo.url}
                alt={`Photo ${index + 1}${photo.label ? ` — ${photo.label}` : ''}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                unoptimized
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 transition-all duration-200 group-hover:bg-black/30" />

              {/* Label badge */}
              {photo.label && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <p className="truncate text-[10px] font-medium uppercase tracking-wider text-white/90">
                    {photo.label}
                  </p>
                </div>
              )}

              {/* Delete button */}
              {canUpload && onDelete && (
                <button
                  type="button"
                  onClick={(e) => void handleDelete(e, index)}
                  disabled={deletingIndex !== null}
                  className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--error)]/90 text-white opacity-0 shadow transition-all duration-200 hover:bg-[var(--error)] hover:scale-110 group-hover:opacity-100 disabled:opacity-50"
                  aria-label={`Delete photo ${index + 1}`}
                >
                  {deletingIndex === index ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  ) : (
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              )}
            </button>
          ))}
        </div>
      ) : (
        !canUpload && (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] py-10 text-center text-sm text-[var(--text-secondary)]">
            No photos available.
          </p>
        )
      )}
    </div>
  );
}
