import { create } from 'zustand';

export interface CursorPosition {
  userId: string;
  projectId: string;
  x: number;
  y: number;
  view: string;
  lastUpdated: number;
}

interface PresenceState {
  onlineUserIds: Set<string>;
  cursors: Map<string, CursorPosition>; // Keyed by userId

  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  setOnlineUsers: (userIds: string[]) => void;

  updateCursor: (cursor: CursorPosition) => void;
  removeCursor: (userId: string) => void;

  cleanupStaleCursors: (timeoutMs?: number) => void;
}

export const usePresenceStore = create<PresenceState>((set, _get) => ({
  onlineUserIds: new Set(),
  cursors: new Map(),

  addOnlineUser: (userId) =>
    set((state) => {
      const newSet = new Set(state.onlineUserIds);
      newSet.add(userId);
      return { onlineUserIds: newSet };
    }),

  removeOnlineUser: (userId) =>
    set((state) => {
      const newSet = new Set(state.onlineUserIds);
      newSet.delete(userId);
      return { onlineUserIds: newSet };
    }),

  setOnlineUsers: (userIds) =>
    set(() => ({
      onlineUserIds: new Set(userIds),
    })),

  updateCursor: (cursor) =>
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.set(cursor.userId, { ...cursor, lastUpdated: Date.now() });
      return { cursors: newCursors };
    }),

  removeCursor: (userId) =>
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.delete(userId);
      return { cursors: newCursors };
    }),

  cleanupStaleCursors: (timeoutMs = 10000) =>
    set((state) => {
      const now = Date.now();
      let changed = false;
      const newCursors = new Map(state.cursors);

      newCursors.forEach((cursor, userId) => {
        if (now - cursor.lastUpdated > timeoutMs) {
          newCursors.delete(userId);
          changed = true;
        }
      });

      return changed ? { cursors: newCursors } : state;
    }),
}));
