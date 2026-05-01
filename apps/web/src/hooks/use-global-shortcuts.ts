'use client';

import { useRouter } from 'next/navigation';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

// ── Sequence tracking for g+letter combos ──

let gPending = false;
let gTimeout: ReturnType<typeof setTimeout>;

function useGoSequence(letter: string, path: string) {
  const router = useRouter();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't fire in input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement).isContentEditable) return;

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPending = true;
        clearTimeout(gTimeout);
        gTimeout = setTimeout(() => {
          gPending = false;
        }, 800);
        return;
      }

      if (gPending && e.key === letter && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        gPending = false;
        router.push(path);
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [letter, path, router]);
}

// ── Shortcut overlay state ──

let _setOverlayOpen: Dispatch<SetStateAction<boolean>> | null = null;

export function useShortcutOverlayState() {
  const [open, setOpen] = useState(false);
  _setOverlayOpen = setOpen;
  return { open, setOpen };
}

// ── Main hook ──

export function useGlobalShortcuts() {
  const _router = useRouter();

  // g+letter sequences
  useGoSequence('d', '/dashboard');
  useGoSequence('p', '/projects');
  useGoSequence('i', '/notifications');
  useGoSequence('a', '/activity');
  useGoSequence('s', '/settings');

  // ⌘K / Ctrl+K → command palette (handled by CommandPalette component)
  // We just ensure the event propagates

  // ? → shortcut overlay
  useHotkeys(
    'shift+/',
    (e) => {
      e.preventDefault();
      _setOverlayOpen?.((v) => !v);
    },
    { enableOnFormTags: false },
  );

  // / → focus search
  useHotkeys(
    '/',
    (e) => {
      e.preventDefault();
      const search = document.querySelector<HTMLInputElement>('[data-search-input]');
      search?.focus();
    },
    { enableOnFormTags: false },
  );

  // c → create task
  useHotkeys(
    'c',
    (e) => {
      e.preventDefault();
      // Dispatch custom event that the quick-create dialog listens for
      window.dispatchEvent(new CustomEvent('tasklane:quick-create'));
    },
    { enableOnFormTags: false },
  );

  // Esc → close modals (handled natively by radix)
}

// ── Shortcut definitions for the overlay ──

export interface ShortcutDef {
  keys: string[];
  description: string;
}

export interface ShortcutSection {
  title: string;
  shortcuts: ShortcutDef[];
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);
const mod = isMac ? '⌘' : 'Ctrl';

export const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Global',
    shortcuts: [
      { keys: [mod, 'K'], description: 'Command palette' },
      { keys: ['?'], description: 'Keyboard shortcuts' },
      { keys: ['/'], description: 'Focus search' },
      { keys: ['c'], description: 'Create task' },
      { keys: ['g', 'd'], description: 'Go to Dashboard' },
      { keys: ['g', 'p'], description: 'Go to Projects' },
      { keys: ['g', 'i'], description: 'Go to Notifications' },
      { keys: ['g', 'a'], description: 'Go to Activity' },
      { keys: ['g', 's'], description: 'Go to Settings' },
      { keys: ['Esc'], description: 'Close modal / dialog' },
    ],
  },
  {
    title: 'List View',
    shortcuts: [
      { keys: ['j', '↓'], description: 'Next row' },
      { keys: ['k', '↑'], description: 'Previous row' },
      { keys: ['Enter'], description: 'Open task' },
      { keys: ['e'], description: 'Inline edit title' },
      { keys: ['x'], description: 'Toggle selection' },
      { keys: [mod, 'A'], description: 'Select all' },
      { keys: ['⌫'], description: 'Delete selected' },
      { keys: ['1-4'], description: 'Set priority' },
      { keys: ['s'], description: 'Cycle status' },
    ],
  },
  {
    title: 'Board',
    shortcuts: [
      { keys: ['←', '→'], description: 'Navigate cards' },
      { keys: ['Enter'], description: 'Open card' },
      { keys: ['⇧', '→'], description: 'Move to next column' },
      { keys: ['⇧', '←'], description: 'Move to prev column' },
    ],
  },
  {
    title: 'Task Dialog',
    shortcuts: [
      { keys: [mod, 'Enter'], description: 'Submit comment' },
      { keys: [mod, '.'], description: 'Close dialog' },
      { keys: [mod, '⇧', 'C'], description: 'Copy task link' },
    ],
  },
];
