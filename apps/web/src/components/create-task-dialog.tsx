'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Loader2 } from 'lucide-react';
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

interface Project {
  id: string;
  name: string;
  key: string;
  teamId: string;
}

const PRIORITIES = [
  { value: 'LOW', label: '🟢 Low' },
  { value: 'MEDIUM', label: '🟡 Medium' },
  { value: 'HIGH', label: '🟠 High' },
  { value: 'URGENT', label: '🔴 Urgent' },
];

export function CreateTaskDialog() {
  const open = useUIStore((s) => s.createTaskOpen);
  const setOpen = useUIStore((s) => s.setCreateTaskOpen);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [teamId, setTeamId] = useState('');
  const [projectId, setProjectId] = useState('');

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

  // Fetch projects for selected team
  const { data: projectsData } = useQuery<{ data: Project[] }>({
    queryKey: ['team-projects', teamId],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${teamId}/projects?limit=100`);
      return data;
    },
    enabled: !!teamId && open,
  });

  const projects = projectsData?.data ?? [];

  // Auto-select first project
  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  // Reset project when team changes
  useEffect(() => {
    setProjectId('');
  }, [teamId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/projects/${projectId}/tasks`, {
        title,
        priority,
      });
      return data;
    },
    onSuccess: () => {
      toast.success(`Task "${title}" created`);
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to create task');
    },
  });

  function resetForm() {
    setTitle('');
    setPriority('MEDIUM');
    setProjectId('');
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            New Task
          </DialogTitle>
          <DialogDescription>
            Create a new task in a project
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

          {/* Project selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Project</label>
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No projects in this team. Create a project first.</p>
            ) : (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary/50"
                required
              >
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                ))}
              </select>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Task title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fix login page styling"
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
              autoFocus
              required
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                    priority === p.value
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {p.label}
                </button>
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
              disabled={!title || !projectId || mutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Task
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
