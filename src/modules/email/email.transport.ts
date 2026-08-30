import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '../../config/env';
import type { EmailTransport, SimulationEmailContent } from './email.types';

export class NodemailerEmailTransport implements EmailTransport {
  private transporter: Transporter | undefined;

  async send(
    content: SimulationEmailContent,
  ): Promise<{ messageId?: string }> {
    const result = await this.getTransporter().sendMail(content);
    return { messageId: result.messageId };
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth:
          env.SMTP_USER && env.SMTP_PASSWORD
            ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
            : undefined,
      });
    }

    return this.transporter;
  }
}
