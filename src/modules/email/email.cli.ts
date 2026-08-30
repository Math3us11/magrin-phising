import { z } from 'zod';

import type { SimulationEmailInput } from './email.types';

const emailAddressSchema = z.string().trim().toLowerCase().email();

export class EmailCliInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailCliInputError';
  }
}

export function maskEmailForDisplay(email: string): string {
  const [localPart = '', domain = ''] = email.split('@');

  if (!localPart || !domain) {
    return '***';
  }

  const visibleCharacters = localPart.length > 1 ? 2 : 1;
  return `${localPart.slice(0, visibleCharacters)}***@${domain}`;
}

export function isSendConfirmed(answer: string): boolean {
  return ['s', 'sim'].includes(answer.trim().toLowerCase());
}

export function isTemporaryAuthorizationConfirmed(answer: string): boolean {
  return answer.trim() === 'AUTORIZADO';
}

export function resolveInteractiveEmailInput(
  participantCode: string,
  recipient: string,
  allowedParticipantCodes: readonly string[],
  allowedRecipients: readonly string[],
): {
  input: SimulationEmailInput;
  requiresTemporaryAuthorization: boolean;
} {
  if (!allowedParticipantCodes.includes(participantCode)) {
    throw new EmailCliInputError('O codigo do participante nao esta autorizado.');
  }

  if (!recipient.trim()) {
    return {
      input: resolveEmailCommandInput(
        [participantCode],
        allowedParticipantCodes,
        allowedRecipients,
      ),
      requiresTemporaryAuthorization: false,
    };
  }

  const parsedRecipient = emailAddressSchema.safeParse(recipient);

  if (!parsedRecipient.success) {
    throw new EmailCliInputError('Informe um endereco de e-mail valido.');
  }

  const isStaticallyAllowed = allowedRecipients.some(
    (allowed) => allowed.trim().toLowerCase() === parsedRecipient.data,
  );

  return {
    input: { participantCode, recipient: parsedRecipient.data },
    requiresTemporaryAuthorization: !isStaticallyAllowed,
  };
}

export function resolveEmailCommandInput(
  args: readonly string[],
  allowedParticipantCodes: readonly string[],
  allowedRecipients: readonly string[],
): { participantCode: string; recipient: string } {
  const participantCode = args[0];
  const requestedRecipient = args[1]?.trim().toLowerCase();
  const normalizedRecipients = allowedRecipients.map((recipient) =>
    recipient.trim().toLowerCase(),
  );

  if (!participantCode || !allowedParticipantCodes.includes(participantCode)) {
    throw new EmailCliInputError(
      'Informe um participante autorizado. Exemplo: npm run email:send -- P001',
    );
  }

  if (requestedRecipient) {
    if (!normalizedRecipients.includes(requestedRecipient)) {
      throw new EmailCliInputError(
        'O destinatario informado nao pertence a EMAIL_RECIPIENT_ALLOWLIST.',
      );
    }

    return { participantCode, recipient: requestedRecipient };
  }

  if (normalizedRecipients.length !== 1) {
    throw new EmailCliInputError(
      'Configure um unico destinatario ou informe um endereco da allowlist como segundo argumento.',
    );
  }

  const recipient = normalizedRecipients[0];
  if (!recipient) {
    throw new EmailCliInputError('A allowlist de destinatarios esta vazia.');
  }

  return { participantCode, recipient };
}
