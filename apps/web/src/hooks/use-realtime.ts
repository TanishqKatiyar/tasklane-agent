import { useQueryClient } from '@tanstack/react-query';
import type { EventTask } from '@tasklane/shared';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { useAuthStore } from '@/lib/auth';
import { socket } from '@/lib/socket';
import { usePresenceStore } from '@/stores/presence-store';

export function useRealtimeProject(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuthStore();
  const { addOnlineUser, removeOnlineUser, updateCursor } = usePresenceStore();

  useEffect(() => {
    if (!projectId || !accessToken || !user) return;

    // Connect socket if not connected
    if (!socket.connected) {
      socket.auth = { token: accessToken };
      socket.connect();
    }

    // Join project room
    socket.emit('project:join', { projectId });

    // ── System Events ──
    const onConnectError = (err: Error) => {
      console.error('Socket connection error:', err);
      // Wait for it to reconnect automatically
    };

    const onDisconnect = (reason: string) => {
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, reconnect manually
        socket.connect();
      }
      toast.warning('Realtime connection lost. Reconnecting...');
    };

    const onReconnect = () => {
      toast.success('Realtime connection restored.');
      // Re-join room
      socket.emit('project:join', { projectId });
      // Invalidate queries to fetch anything missed while disconnected
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    };

    // ── Business Events ──
    const onTaskCreated = ({ task, actorId }: { task: EventTask; actorId: string }) => {
      if (actorId === user.id) return;

      queryClient.setQueriesData({ queryKey: ['tasks', projectId] }, (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return [...oldData, task];
      });
    };

    const onTaskUpdated = ({ task, actorId }: { task: EventTask; actorId: string }) => {
      if (actorId === user.id) return;

      queryClient.setQueriesData({ queryKey: ['tasks', projectId] }, (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((t: any) => (t.id === task.id ? { ...t, ...task } : t));
      });
    };

    const onTaskMoved = ({ task, actorId }: { task: EventTask; actorId: string }) => {
      if (actorId === user.id) return;

      queryClient.setQueriesData({ queryKey: ['tasks', projectId] }, (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((t: any) => (t.id === task.id ? { ...t, ...task } : t));
      });
    };

    const onTaskDeleted = ({ taskId, actorId }: { taskId: string; actorId: string }) => {
      if (actorId === user.id) return;

      queryClient.setQueriesData({ queryKey: ['tasks', projectId] }, (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter((t: any) => t.id !== taskId);
      });
    };

    const onPresenceOnline = ({ userId }: { userId: string }) => {
      if (userId !== user.id) {
        addOnlineUser(userId);
      }
    };

    const onPresenceOffline = ({ userId }: { userId: string }) => {
      removeOnlineUser(userId);
    };

    const onCursorMoved = ({ userId, x, y, view }: any) => {
      if (userId !== user.id && view === 'kanban') {
        updateCursor({ userId, projectId, x, y, view, lastUpdated: Date.now() });
      }
    };

    // Bind listeners
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect', onReconnect);

    socket.on('task.created', onTaskCreated);
    socket.on('task.updated', onTaskUpdated);
    socket.on('task.moved', onTaskMoved);
    socket.on('task.deleted', onTaskDeleted);
    socket.on('presence.online', onPresenceOnline);
    socket.on('presence.offline', onPresenceOffline);
    socket.on('cursor:moved', onCursorMoved);

    // Cleanup
    return () => {
      socket.emit('project:leave', { projectId });
      
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect', onReconnect);

      socket.off('task.created', onTaskCreated);
      socket.off('task.updated', onTaskUpdated);
      socket.off('task.moved', onTaskMoved);
      socket.off('task.deleted', onTaskDeleted);
      socket.off('presence.online', onPresenceOnline);
      socket.off('presence.offline', onPresenceOffline);
      socket.off('cursor:moved', onCursorMoved);
    };
  }, [projectId, accessToken, user, queryClient, addOnlineUser, removeOnlineUser, updateCursor]);
}
