'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { useUIStore } from '@/stores/ui-store';

interface Team {
  id: string;
  name: string;
  slug: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

export function CreateProjectDialog() {
  const open = useUIStore((s) => s.createProjectOpen);
  const setOpen = useUIStore((s) => s.setCreateProjectOpen);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [autoKey, setAutoKey] = useState(true);

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['sidebar-teams'],
    queryFn: async () => {
      const { data } = await api.get('/teams');
      return data;
    },
    enabled: open,
  });

  // Auto-select first team
  useEffect(() => {
    if (teams.length > 0 && !teamId) {
      setTeamId(teams[0].id);
    }
  }, [teams, teamId]);

  // Auto-generate key from name
  useEffect(() => {
    if (autoKey && name) {
      const generated = name
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 5);
      setKey(generated || 'PRJ');
    }
  }, [name, autoKey]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/teams/${teamId}/projects`, {
        name,
        key,
        description: description || undefined,
        color,
      });
      return data;
    },
    onSuccess: (project: any) => {
      toast.success(`Project "${name}" created`);
      queryClient.invalidateQueries({ queryKey: ['team-projects'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-teams'] });
      setOpen(false);
      resetForm();
      router.push(`/projects/${project.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to create project');
    },
  });

  function resetForm() {
    setName('');
    setKey('');
    setDescription('');
    setColor(COLORS[0]);
    setAutoKey(true);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            New Project
          </DialogTitle>
          <DialogDescription>
            Create a new project in your team
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-4"
        >
          {/* Team selector */}
          {teams.length > 1 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Team</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Project name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing Website"
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
              autoFocus
              required
            />
          </div>

          {/* Key */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Key</label>
            <input
              type="text"
              value={key}
              onChange={(e) => { setKey(e.target.value.toUpperCase()); setAutoKey(false); }}
              placeholder="e.g. MKT"
              maxLength={5}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono outline-none placeholder:text-muted-foreground focus:border-primary/50"
              required
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: c === color ? 'white' : 'transparent',
                    transform: c === color ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => { setOpen(false); resetForm(); }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name || !key || !teamId || mutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Project
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
