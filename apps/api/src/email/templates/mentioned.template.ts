export function mentionedEmailTemplate(params: {
  title: string;
  body: string;
  link?: string;
  unsubUrl: string;
}): { subject: string; html: string } {
  const { title, body, link, unsubUrl } = params;

  return {
    subject: title,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a2e;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="font-size:24px;font-weight:700;color:#6366f1;margin:0;">Tasklane</h1>
  </div>
  <div style="background:#f8fafc;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <div style="display:inline-block;background:#8b5cf6;color:#fff;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;margin-bottom:16px;">💬 You were mentioned</div>
    <h2 style="font-size:18px;margin:0 0 12px;">${title}</h2>
    <p style="margin:0 0 24px;line-height:1.6;color:#475569;">${body}</p>
    ${
      link
        ? `<div style="text-align:center;">
      <a href="${link}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
        View Comment
      </a>
    </div>`
        : ''
    }
  </div>
  <p style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:center;">
    <a href="${unsubUrl}" style="color:#94a3b8;">Unsubscribe from mention emails</a>
  </p>
</body>
</html>`.trim(),
  };
}
