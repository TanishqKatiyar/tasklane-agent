interface DigestTask {
  id: string;
  title: string;
  priority: string;
  dueDate?: Date | null;
}

interface DigestMention {
  comment: {
    body: string;
    task: { id: string; title: string };
  };
}

function priorityBadge(priority: string): string {
  const map: Record<string, string> = {
    URGENT: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e',
  };
  return `<span style="display:inline-block;background:${map[priority] ?? '#94a3b8'};color:#fff;border-radius:4px;padding:1px 6px;font-size:11px;font-weight:600;">${priority}</span>`;
}

function taskRow(task: DigestTask, frontendUrl: string): string {
  return `
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:10px 0;">
        <a href="${frontendUrl}/tasks/${task.id}" style="color:#1a1a2e;text-decoration:none;font-weight:500;">${task.title}</a>
        ${task.dueDate ? `<span style="margin-left:8px;font-size:12px;color:#94a3b8;">${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
      </td>
      <td style="padding:10px 0;text-align:right;">${priorityBadge(task.priority)}</td>
    </tr>`;
}

function section(title: string, icon: string, color: string, rows: string): string {
  if (!rows) return '';
  return `
    <h3 style="font-size:14px;font-weight:600;color:${color};margin:24px 0 8px;display:flex;align-items:center;gap:6px;">${icon} ${title}</h3>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>`;
}

export function digestEmailTemplate(params: {
  userName: string;
  dueTodayTasks: DigestTask[];
  overdueTasks: DigestTask[];
  assignedRecently: DigestTask[];
  mentionsRecently: DigestMention[];
  frontendUrl: string;
}): { subject: string; html: string } {
  const { userName, dueTodayTasks, overdueTasks, assignedRecently, mentionsRecently, frontendUrl } = params;

  const dueTodayRows = dueTodayTasks.map((t) => taskRow(t, frontendUrl)).join('');
  const overdueRows = overdueTasks.map((t) => taskRow(t, frontendUrl)).join('');
  const assignedRows = assignedRecently.map((t) => taskRow(t, frontendUrl)).join('');
  const mentionRows = mentionsRecently
    .map(
      (m) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 0;">
          <a href="${frontendUrl}/tasks/${m.comment.task.id}" style="color:#1a1a2e;text-decoration:none;font-weight:500;">${m.comment.task.title}</a>
          <p style="margin:2px 0 0;font-size:13px;color:#64748b;">${m.comment.body.slice(0, 120)}${m.comment.body.length > 120 ? '…' : ''}</p>
        </td>
      </tr>`,
    )
    .join('');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return {
    subject: `Your Tasklane digest — ${today}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a2e;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="font-size:24px;font-weight:700;color:#6366f1;margin:0;">Tasklane</h1>
    <p style="color:#64748b;margin:4px 0 0;">Daily Digest · ${today}</p>
  </div>

  <div style="background:#f8fafc;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <p style="margin:0 0 20px;font-size:15px;">Hi <strong>${userName}</strong>, here's your daily summary:</p>

    ${section('Due Today', '📅', '#6366f1', dueTodayRows)}
    ${section('Overdue', '⚠️', '#ef4444', overdueRows)}
    ${section('Recently Assigned', '✅', '#22c55e', assignedRows)}
    ${section('Unread Mentions', '💬', '#8b5cf6', mentionRows)}

    <div style="text-align:center;margin-top:32px;">
      <a href="${frontendUrl}/dashboard" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
        Go to Dashboard
      </a>
    </div>
  </div>

  <p style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:center;">
    <a href="${frontendUrl}/settings/notifications" style="color:#94a3b8;">Manage digest preferences</a>
  </p>
</body>
</html>`.trim(),
  };
}
