import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock socket.io-client — factory must not reference external vars ──
vi.mock('@/lib/socket', () => ({
  socket: {
    connected: false,
    auth: {} as Record<string, unknown>,
    connect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    io: {
      on: vi.fn(),
      off: vi.fn(),
    },
  },
}));

// ── Mock auth store ──
vi.mock('@/lib/auth', () => ({
  useAuthStore: () => ({
    accessToken: 'test-token-123',
    user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
  }),
}));

// ── Mock presence store ──
const addOnlineUser = vi.fn();
const removeOnlineUser = vi.fn();
const updateCursor = vi.fn();
vi.mock('@/stores/presence-store', () => ({
  usePresenceStore: () => ({
    addOnlineUser,
    removeOnlineUser,
    updateCursor,
  }),
}));

// ── Mock tanstack query ──
const mockSetQueriesData = vi.fn();
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueriesData: mockSetQueriesData,
    invalidateQueries: mockInvalidateQueries,
  }),
}));

// ── Mock sonner ──
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Import after mocks ──
/* eslint-disable import/first */
import { renderHook } from '@testing-library/react';

import { useRealtimeProject } from '@/hooks/use-realtime';
import { socket } from '@/lib/socket';
/* eslint-enable import/first */

// Get typed reference to mocked socket
const mockSocket = vi.mocked(socket);

describe('useRealtimeProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockSocket as any).connected = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should join project room on mount', () => {
    renderHook(() => useRealtimeProject('project-1'));

    expect(mockSocket.connect).toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('project:join', {
      projectId: 'project-1',
    });
  });

  it('should register all event listeners on mount', () => {
    renderHook(() => useRealtimeProject('project-1'));

    const registeredEvents = mockSocket.on.mock.calls.map((call) => call[0]);

    expect(registeredEvents).toContain('connect_error');
    expect(registeredEvents).toContain('disconnect');
    expect(registeredEvents).toContain('task.created');
    expect(registeredEvents).toContain('task.updated');
    expect(registeredEvents).toContain('task.moved');
    expect(registeredEvents).toContain('task.deleted');
    expect(registeredEvents).toContain('presence.online');
    expect(registeredEvents).toContain('presence.offline');
    expect(registeredEvents).toContain('cursor:moved');
  });

  it('should leave project room and clean up on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeProject('project-1'));

    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith('project:leave', {
      projectId: 'project-1',
    });
    expect(mockSocket.off).toHaveBeenCalled();
  });

  it('should not connect when projectId is undefined', () => {
    renderHook(() => useRealtimeProject(undefined));

    expect(mockSocket.connect).not.toHaveBeenCalled();
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('should skip socket.connect if already connected', () => {
    (mockSocket as any).connected = true;

    renderHook(() => useRealtimeProject('project-1'));

    expect(mockSocket.connect).not.toHaveBeenCalled();
    // But should still join the room
    expect(mockSocket.emit).toHaveBeenCalledWith('project:join', {
      projectId: 'project-1',
    });
  });

  it('should patch query cache on task.updated from another user', () => {
    renderHook(() => useRealtimeProject('project-1'));

    // Find the task.updated handler
    const taskUpdatedCall = mockSocket.on.mock.calls.find((call) => call[0] === 'task.updated');
    expect(taskUpdatedCall).toBeDefined();

    const handler = taskUpdatedCall![1] as (data: unknown) => void;

    // Simulate receiving an update from another user
    handler({
      task: { id: 'task-1', title: 'Updated Title', status: 'DONE' },
      actorId: 'user-2', // different from our user-1
    });

    // Should call setQueriesData to patch the cache
    expect(mockSetQueriesData).toHaveBeenCalledWith(
      { queryKey: ['tasks', 'project-1'] },
      expect.any(Function),
    );
  });

  it('should IGNORE events from the current user (actorId === user.id)', () => {
    renderHook(() => useRealtimeProject('project-1'));

    const taskUpdatedCall = mockSocket.on.mock.calls.find((call) => call[0] === 'task.updated');
    const handler = taskUpdatedCall![1] as (data: unknown) => void;

    // Simulate receiving an update from self
    handler({
      task: { id: 'task-1', title: 'Self Update' },
      actorId: 'user-1', // same as our user
    });

    // Should NOT touch the cache
    expect(mockSetQueriesData).not.toHaveBeenCalled();
  });

  it('should call addOnlineUser on presence.online from another user', () => {
    renderHook(() => useRealtimeProject('project-1'));

    const presenceCall = mockSocket.on.mock.calls.find((call) => call[0] === 'presence.online');
    const handler = presenceCall![1] as (data: unknown) => void;

    handler({ userId: 'user-2' });

    expect(addOnlineUser).toHaveBeenCalledWith('user-2');
  });

  it('should NOT call addOnlineUser for own presence event', () => {
    renderHook(() => useRealtimeProject('project-1'));

    const presenceCall = mockSocket.on.mock.calls.find((call) => call[0] === 'presence.online');
    const handler = presenceCall![1] as (data: unknown) => void;

    handler({ userId: 'user-1' }); // same as current user

    expect(addOnlineUser).not.toHaveBeenCalled();
  });
});
