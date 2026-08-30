import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

import { env } from '../config/env';
import {
  EmailCliInputError,
  isSendConfirmed,
  isTemporaryAuthorizationConfirmed,
  maskEmailForDisplay,
  resolveEmailCommandInput,
  resolveInteractiveEmailInput,
} from '../modules/email/email.cli';
import type { SimulationEmailInput } from '../modules/email/email.types';

interface AdminResponse {
  ok?: boolean;
  status?: string;
  error?: string;
}

interface CommandRequest {
  input: SimulationEmailInput;
  requiresTemporaryAuthorization: boolean;
}

class AdminApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminApiError';
  }
}

async function requestInteractiveInput(): Promise<
  CommandRequest | undefined
> {
  const terminal = createInterface({ input: stdin, output: stdout });

  try {
    const defaultParticipant = env.ALLOWED_PARTICIPANT_CODES[0] ?? '';

    console.info('\n=== Envio de e-mail da Simulação Acadêmica ===\n');
    console.info(
      `Participantes autorizados: ${env.ALLOWED_PARTICIPANT_CODES.join(', ')}`,
    );

    const participantAnswer = await terminal.question(
      `Código do participante [${defaultParticipant}]: `,
    );
    const participantCode = participantAnswer.trim() || defaultParticipant;
    const recipient = await terminal.question(
      'Enviar e-mail para (Enter usa a allowlist fixa): ',
    );
    const resolved = resolveInteractiveEmailInput(
      participantCode,
      recipient,
      env.ALLOWED_PARTICIPANT_CODES,
      env.EMAIL_RECIPIENT_ALLOWLIST,
    );

    if (resolved.requiresTemporaryAuthorization) {
      if (!env.ALLOW_RUNTIME_RECIPIENT_AUTHORIZATION) {
        throw new EmailCliInputError(
          'A autorizacao temporaria esta desabilitada na configuracao local.',
        );
      }

      const consent = await terminal.question(
        'O voluntário autorizou o teste? Digite AUTORIZADO: ',
      );

      if (!isTemporaryAuthorizationConfirmed(consent)) {
        console.info('Autorização cancelada. Nenhuma mensagem foi enviada.');
        return undefined;
      }
    }

    console.info('\nConfira antes do envio:');
    console.info(`- participante: ${resolved.input.participantCode}`);
    console.info(
      `- destinatário: ${maskEmailForDisplay(resolved.input.recipient)}`,
    );
    console.info(
      `- autorização: ${resolved.requiresTemporaryAuthorization ? 'temporária, uso único' : 'allowlist fixa'}`,
    );
    console.info(`- modo: ${env.EMAIL_MODE}`);
    console.info(`- link base: ${env.SIMULATION_BASE_URL}`);

    const confirmation = await terminal.question('\nConfirmar envio? [s/N]: ');

    if (!isSendConfirmed(confirmation)) {
      console.info('Envio cancelado. Nenhuma mensagem foi enviada.');
      return undefined;
    }

    return resolved;
  } finally {
    terminal.close();
  }
}

async function resolveInput(): Promise<CommandRequest | undefined> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    return requestInteractiveInput();
  }

  return {
    input: resolveEmailCommandInput(
      args,
      env.ALLOWED_PARTICIPANT_CODES,
      env.EMAIL_RECIPIENT_ALLOWLIST,
    ),
    requiresTemporaryAuthorization: false,
  };
}

async function callAdminApi(
  path: string,
  payload: Record<string, string>,
): Promise<AdminResponse> {
  const endpoint = new URL(path, env.SIMULATION_BASE_URL);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.ADMIN_API_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const result = (await response.json()) as AdminResponse;

  if (!response.ok) {
    throw new AdminApiError(
      result.error ?? `A API respondeu com HTTP ${response.status}.`,
    );
  }

  return result;
}

async function sendEmail(): Promise<void> {
  const request = await resolveInput();

  if (!request) {
    return;
  }

  if (request.requiresTemporaryAuthorization) {
    await callAdminApi('/admin/email/authorize', {
      ...request.input,
      consent: 'AUTORIZADO',
    });
  }

  const result = await callAdminApi('/admin/send', { ...request.input });

  console.info(
    result.status === 'already_sent'
      ? 'O participante ja possui um envio confirmado; nenhum reenvio foi feito.'
      : 'E-mail confirmado pelo transporte e evento email_sent registrado.',
  );
}

sendEmail().catch((error: unknown) => {
  if (error instanceof EmailCliInputError || error instanceof AdminApiError) {
    console.error(`Falha: ${error.message}`);
  } else {
    console.error(
      'Falha ao chamar a aplicacao. Confirme que npm run dev esta ativo e revise npm run email:check.',
    );
  }

  process.exitCode = 1;
});
