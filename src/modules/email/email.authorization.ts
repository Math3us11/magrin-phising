import type { EmailRecipientAuthorizationStore } from './email.types';

interface TemporaryAuthorization {
  expiresAt: number;
  reserved: boolean;
}

export class InMemoryEmailRecipientAuthorizationStore
  implements EmailRecipientAuthorizationStore
{
  private readonly authorizations = new Map<string, TemporaryAuthorization>();

  constructor(private readonly now: () => number = Date.now) {}

  authorize(
    participantCode: string,
    recipient: string,
    ttlMilliseconds: number,
  ): Date {
    const expiresAt = this.now() + ttlMilliseconds;
    this.authorizations.set(this.key(participantCode, recipient), {
      expiresAt,
      reserved: false,
    });

    return new Date(expiresAt);
  }

  claim(participantCode: string, recipient: string): boolean {
    const key = this.key(participantCode, recipient);
    const authorization = this.authorizations.get(key);

    if (!authorization || authorization.expiresAt <= this.now()) {
      this.authorizations.delete(key);
      return false;
    }

    if (authorization.reserved) {
      return false;
    }

    authorization.reserved = true;
    return true;
  }

  release(participantCode: string, recipient: string): void {
    const key = this.key(participantCode, recipient);
    const authorization = this.authorizations.get(key);

    if (!authorization || authorization.expiresAt <= this.now()) {
      this.authorizations.delete(key);
      return;
    }

    authorization.reserved = false;
  }

  consume(participantCode: string, recipient: string): void {
    this.authorizations.delete(this.key(participantCode, recipient));
  }

  private key(participantCode: string, recipient: string): string {
    return `${participantCode}\u0000${recipient.trim().toLowerCase()}`;
  }
}
