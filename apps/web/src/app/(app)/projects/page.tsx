'use client';

import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Loader2 } from 'lucide-react';
import Link from 'next/link';

import api from '@/lib/api';

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  status: string;
  color?: string | null;
  taskCounts: Record<string, number>;
}

function useMyTeams() {
  return useQuery<Team[]>({
    queryKey: ['my-teams'],
    queryFn: async () => {
      const { data } = await api.get('/teams');
      return data;
    },
  });
}

function useTeamProjects(teamId: string) {
  return useQuery<{ data: Project[] }>({
    queryKey: ['team-projects', teamId],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${teamId}/projects?limit=100`);
      return data;
    },
    enabled: !!teamId,
  });
}

function ProjectCard({ project }: { project: Project }) {
  const totalTasks = Object.values(project.taskCounts).reduce((s, n) => s + n, 0);
  const doneTasks = project.taskCounts['DONE'] ?? 0;
  const statusTone =
    project.status === 'ACTIVE'
      ? { bg: 'rgb(27 107 61 / 0.12)', fg: '#1b6b3d' }
      : project.status === 'ARCHIVED'
      ? { bg: 'rgb(232 184 64 / 0.18)', fg: '#8a6d20' }
      : { bg: 'rgb(107 155 201 / 0.18)', fg: '#3a6f9c' };

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-[var(--p-rule)] bg-[var(--p-paper-deep)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--p-accent)]"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold text-[var(--p-paper)]"
          style={{ backgroundColor: project.color ?? 'var(--p-ink)' }}
        >
          {project.key.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display p-display truncate text-[18px] tracking-tight transition-colors group-hover:text-[var(--p-accent)]">
            {project.name}
          </h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink-soft)]">
            {project.key}
          </p>
        </div>
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]"
          style={{ background: statusTone.bg, color: statusTone.fg }}
        >
          {project.status}
        </span>
      </div>

      {project.description && (
        <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-[var(--p-ink-muted)]">
          {project.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink-soft)] tabular-nums">
        <span>{totalTasks} tasks</span>
        {totalTasks > 0 && (
          <>
            <span>·</span>
            <span>{doneTasks} done</span>
            <div className="flex-1">
              <div className="h-1 overflow-hidden rounded-full bg-[var(--p-rule)]">
                <div
                  className="h-full rounded-full bg-[var(--p-accent)] transition-all"
                  style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

function TeamProjectGroup({ team }: { team: Team }) {
  const { data, isLoading } = useTeamProjects(team.id);
  const projects = data?.data ?? [];

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded font-mono text-[10px] font-bold text-[var(--p-paper)]" style={{ background: 'var(--p-ink)' }}>
          {(team.slug ?? team.name).slice(0, 2).toUpperCase()}
        </div>
        <h2 className="font-display p-display text-[22px] leading-none tracking-tight">{team.name}</h2>
        <span className="h-px flex-1 bg-[var(--p-rule)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink-soft)] tabular-nums">
          {String(projects.length).padStart(2, '0')} projects
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-32 rounded-2xl bg-[var(--p-paper-muted)]" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--p-rule)] bg-[var(--p-paper-deep)] p-6 text-center">
          <p className="text-sm text-[var(--p-ink-soft)]">No projects in this team yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProjectsPage() {
  const { data: teams, isLoading } = useMyTeams();

  return (
    <div className="min-h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-ink-soft)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--p-accent)]" />
          <span>Workspace · Projects</span>
        </div>

        <h1 className="font-display p-display text-[44px] leading-[1.0] tracking-tight">
          Every project,{' '}
          <span className="italic" style={{ color: 'var(--p-accent)' }}>
            in one place
          </span>
          .
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[var(--p-ink-muted)]">
          Grouped by team. Click into one to see its board, list, calendar, or
          timeline.
        </p>

        <div className="mt-10">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--p-ink-soft)]" />
            </div>
          ) : !teams || teams.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--p-rule)] bg-[var(--p-paper-deep)] px-6 py-16 text-center">
              <FolderKanban
                className="mb-3 h-7 w-7 text-[var(--p-ink-softer)]"
                strokeWidth={1.5}
              />
              <p className="font-display p-display text-[22px] tracking-tight">
                No projects{' '}
                <span className="italic" style={{ color: 'var(--p-accent)' }}>
                  yet
                </span>
                .
              </p>
              <p className="mt-1 max-w-[280px] text-[13px] text-[var(--p-ink-soft)]">
                Join a team and create your first project to get going.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {teams.map((team) => (
                <TeamProjectGroup key={team.id} team={team} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
