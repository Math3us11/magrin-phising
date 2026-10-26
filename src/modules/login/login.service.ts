import { z } from 'zod';

import { env } from '../../config/env';
import { maskCpf, maskPassword, normalizeCpf } from '../../utils/mask';
import { participantService } from '../participants/participants.service';
import { SequelizeLoginPersistence } from './login.repository';
import type {
  LoginOperations,
  LoginPersistence,
  MaskedLoginSubmission,
  ParticipantResolver,
} from './login.types';

const cpfSchema = z
  .string()
  .min(11)
  .max(14)
  .transform(normalizeCpf)
  .pipe(z.string().regex(/^\d{11}$/));

const loginSubmissionSchema = z.object({
  p: z.string().min(1),
  cpf: cpfSchema,
  password: z.string().min(4).max(64),
});

export class LoginValidationError extends Error {
  constructor() {
    super('Dados de demonstracao invalidos.');
    this.name = 'LoginValidationError';
  }
}

export class LoginService implements LoginOperations {
  constructor(
    private readonly persistence: LoginPersistence,
    private readonly resolver: ParticipantResolver,
    private readonly allowedTestCpfs: readonly string[],
  ) {}

  async registerClick(token: string | undefined): Promise<boolean> {
    if (!token) {
      return false;
    }

    const participant = await this.resolver.resolveToken(token);

    if (!participant) {
      return false;
    }

    await this.persistence.recordEvent(
      participant.participantCode,
      'link_clicked',
      participant.campaignId,
    );
    return true;
  }

  async submit(input: unknown): Promise<MaskedLoginSubmission> {
    const parsed = loginSubmissionSchema.safeParse(input);

    if (!parsed.success) {
      throw new LoginValidationError();
    }

    const participant = await this.resolver.resolveToken(parsed.data.p);

    // Token invalido/expirado ou CPF fora do cadastro ficticio: descartados sem
    // persistir o conteudo submetido (AGENTS secoes 2.1 e 6).
    if (!participant || !this.allowedTestCpfs.includes(parsed.data.cpf)) {
      throw new LoginValidationError();
    }

    const maskedSubmission: MaskedLoginSubmission = {
      participantCode: participant.participantCode,
      campaignId: participant.campaignId,
      cpfMasked: maskCpf(parsed.data.cpf),
      passwordMasked: maskPassword(parsed.data.password),
    };

    await this.persistence.saveSubmissionAndEvent(maskedSubmission);
    return maskedSubmission;
  }
}

export const loginService = new LoginService(
  new SequelizeLoginPersistence(),
  participantService,
  env.ALLOWED_TEST_CPFS,
);
