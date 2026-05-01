'use client';

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Users } from 'lucide-react';

import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface TeamMember {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  role: string;
  joinedAt?: string;
  createdAt?: string;
}

function useTeamMembers(teamId: string) {
  return useQuery<TeamMember[]>({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${teamId}/members`);
      return data;
    },
    enabled: !!teamId,
  });
}

function useTeam(teamId: string) {
  return useQuery<{ id: string; name: string; slug: string }>({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${teamId}`);
      return data;
    },
    enabled: !!teamId,
  });
}

interface Props {
  params: { teamId: string };
}

export default function TeamMembersPage({ params }: Props) {
  const { teamId } = params;
  const { data: members, isLoading } = useTeamMembers(teamId);
  const { data: team } = useTeam(teamId);

  return (
    <div className="min-h-full p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Members</h1>
            <p className="text-sm text-muted-foreground">
              {team ? `${team.name} team members` : 'Team members'}
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/50 skeleton-shimmer" />
            ))}
          </div>
        ) : !members || members.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
              <span>Member</span>
              <span>Email</span>
              <span className="w-20 text-center">Role</span>
              <span className="w-28 text-right">Joined</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {members.map((member) => {
                const initials = member.user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={member.user.id}
                    className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {member.user.avatarUrl ? (
                          <img
                            src={member.user.avatarUrl}
                            alt={member.user.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <span className="text-sm font-medium truncate">{member.user.name}</span>
                    </div>

                    <span className="text-sm text-muted-foreground truncate">
                      {member.user.email}
                    </span>

                    <span
                      className={cn(
                        'w-20 text-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                        member.role === 'ADMIN'
                          ? 'bg-violet-500/10 text-violet-500'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {member.role}
                    </span>

                    <span className="w-28 text-right text-xs text-muted-foreground">
                      {member.joinedAt || member.createdAt
                        ? formatDistanceToNow(new Date(member.joinedAt ?? member.createdAt!), {
                            addSuffix: true,
                          })
                        : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
