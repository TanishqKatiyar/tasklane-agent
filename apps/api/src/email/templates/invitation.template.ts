/**
 * Simple HTML template for team invitation emails.
 */
export function invitationEmailTemplate(params: {
  teamName: string;
  inviterEmail: string;
  inviteUrl: string;
  role: string;
}): { subject: string; html: string } {
  const { teamName, inviterEmail, inviteUrl, role } = params;

  return {
    subject: `You've been invited to join "${teamName}" on Tasklane`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #6366f1; margin: 0;">Tasklane</h1>
  </div>
  <div style="background: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
    <h2 style="font-size: 20px; margin: 0 0 16px;">You're invited!</h2>
    <p style="margin: 0 0 12px; line-height: 1.6;">
      <strong>${inviterEmail}</strong> has invited you to join
      <strong>${teamName}</strong> as a <strong>${role}</strong>.
    </p>
    <p style="margin: 0 0 24px; line-height: 1.6; color: #64748b;">
      Click the button below to accept the invitation and start collaborating.
    </p>
    <div style="text-align: center;">
      <a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
        Accept Invitation
      </a>
    </div>
  </div>
  <p style="margin-top: 24px; font-size: 13px; color: #94a3b8; text-align: center;">
    If you didn't expect this invitation, you can safely ignore this email.
  </p>
</body>
</html>`.trim(),
  };
}
