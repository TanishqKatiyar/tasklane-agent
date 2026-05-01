import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Sends an email. In dev mode, logs to console instead of sending.
   * In production, uses Resend API.
   */
  async send(to: string, subject: string, html: string): Promise<void> {
    const resendKey = this.config.get<string>('RESEND_API_KEY');

    if (!resendKey || resendKey === 'dev-placeholder') {
      this.logger.log(`📧 [DEV] Email to: ${to}`);
      this.logger.log(`   Subject: ${subject}`);
      this.logger.debug(`   Body preview: ${html.slice(0, 200)}...`);
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: this.config.get<string>(
            'EMAIL_FROM',
            'Tasklane <noreply@tasklane.dev>',
          ),
          to,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        this.logger.error(`Failed to send email to ${to}: ${err}`);
      } else {
        this.logger.log(`Email sent to ${to}: ${subject}`);
      }
    } catch (err) {
      this.logger.error(`Email send error: ${err}`);
    }
  }
}
