'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type ShortcutAction = () => void;

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: ShortcutAction;
  description: string;
  category?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          metaMatch &&
          shiftMatch &&
          altMatch
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

// Global shortcuts hook with common actions
export function useGlobalShortcuts() {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'h',
      meta: true,
      action: () => router.push('/dashboard'),
      description: 'Go to Dashboard',
      category: 'Navigation',
    },
    {
      key: 's',
      meta: true,
      action: () => router.push('/dashboard/shipments'),
      description: 'Go to Shipments',
      category: 'Navigation',
    },
    {
      key: 'c',
      meta: true,
      action: () => router.push('/dashboard/containers'),
      description: 'Go to Containers',
      category: 'Navigation',
    },
    {
      key: 'i',
      meta: true,
      action: () => router.push('/dashboard/invoices'),
      description: 'Go to Invoices',
      category: 'Navigation',
    },
    {
      key: 'n',
      meta: true,
      shift: true,
      action: () => router.push('/dashboard/shipments/new'),
      description: 'New Shipment',
      category: 'Actions',
    },
  ];

  useKeyboardShortcuts(shortcuts);
  
  return shortcuts;
}

// Format shortcut for display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.meta) parts.push('⌘');
  if (shortcut.shift) parts.push('⇧');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
}
