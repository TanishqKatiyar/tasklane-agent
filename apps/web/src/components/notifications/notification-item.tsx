'use client';

import { formatDistanceToNow } from 'date-fns';
import { AtSign, Calendar, Check, ClipboardList, MessageSquare, Trash2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { AppNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { Icon: React.ElementType; tag: string }> = {
  TASK_ASSIGNED: { Icon: ClipboardList, tag: 'Assigned' },
  MENTION: { Icon: AtSign, tag: 'Mention' },
  TASK_COMMENTED: { Icon: MessageSquare, tag: 'Comment' },
  DUE_DATE: { Icon: Calendar, tag: 'Due' },
  TEAM_UPDATE: { Icon: Users, tag: 'Team' },
};

interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const router = useRouter();
  const cfg = TYPE_CONFIG[notification.type] ?? { Icon: ClipboardList, tag: 'Update' };
  const isUnread = !notification.readAt;

  const handleClick = () => {
    if (isUnread) onMarkRead(notification.id);
    if (notification.link) router.push(notification.link);
  };

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors duration-200',
        'hover:bg-foreground/[0.025]',
        isUnread && 'bg-[rgb(var(--signature))]/[0.04]',
      )}
      onClick={handleClick}
    >
      {/* Unread accent bar */}
      {isUnread && (
        <div className="absolute left-0 top-1/2 h-7 w-[2px] -translate-y-1/2 rounded-r bg-[rgb(var(--signature))]" />
      )}

      {/* Icon glyph */}
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ring-inner-hl',
          isUnread
            ? 'border-[rgb(var(--signature))]/30 bg-[rgb(var(--signature))]/10 text-[rgb(var(--signature))]'
            : 'border-border/60 bg-card text-muted-foreground',
        )}
      >
        <cfg.Icon className="h-4 w-4" strokeWidth={1.7} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span
            className={cn(
              'font-mono text-[9px] uppercase tracking-[0.2em]',
              isUnread ? 'text-[rgb(var(--signature))]' : 'text-muted-foreground/70',
            )}
          >
            {cfg.tag}
          </span>
          <span className="h-px flex-1 bg-border/40" />
          <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        <p
          className={cn(
            'text-[14px] leading-snug',
            isUnread ? 'font-medium text-foreground' : 'font-normal text-foreground/85',
          )}
        >
          {notification.title}
        </p>
        {!compact && notification.body && (
          <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-muted-foreground">
            {notification.body}
          </p>
        )}
      </div>

      {/* Actions (hover) */}
      <div
        className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {isUnread && (
          <button
            title="Mark as read"
            onClick={() => onMarkRead(notification.id)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-[rgb(var(--signature))]"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          title="Delete"
          onClick={() => onDelete(notification.id)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
