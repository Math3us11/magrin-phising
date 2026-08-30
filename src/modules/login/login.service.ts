import { z } from 'zod';

import { env } from '../../config/env';
import { maskCpf, maskPassword, normalizeCpf } from '../../utils/mask';
import { SequelizeLoginPersistence } from './login.repository';
import type {
  LoginOperations,
  LoginPersistence,
  LoginSubmissionInput,
  MaskedLoginSubmission,
} from './login.types';

const cpfSchema = z
  .string()
  .min(11)
  .max(14)
  .transform(normalizeCpf)
  .pipe(z.string().regex(/^\d{11}$/));

const loginSubmissionSchema = z.object({
  participantCode: z.string().regex(/^P\d{3,6}$/),
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
    private readonly allowedParticipantCodes: readonly string[],
    private readonly allowedTestCpfs: readonly string[],
  ) {}

  async registerClick(participantCode: string | undefined): Promise<boolean> {
    if (
      !participantCode ||
      !/^P\d{3,6}$/.test(participantCode) ||
      !this.allowedParticipantCodes.includes(participantCode)
    ) {
      return false;
    }

    await this.persistence.recordEvent(participantCode, 'link_clicked');
    return true;
  }

  async submit(input: unknown): Promise<MaskedLoginSubmission> {
    const parsed = loginSubmissionSchema.safeParse(input);

    if (!parsed.success || !this.isAllowedIdentity(parsed.data)) {
      throw new LoginValidationError();
    }

    const maskedSubmission: MaskedLoginSubmission = {
      participantCode: parsed.data.participantCode,
      cpfMasked: maskCpf(parsed.data.cpf),
      passwordMasked: maskPassword(parsed.data.password),
    };

    await this.persistence.saveSubmissionAndEvent(maskedSubmission);
    return maskedSubmission;
  }

  private isAllowedIdentity(input: LoginSubmissionInput): boolean {
    return (
      this.allowedParticipantCodes.includes(input.participantCode) &&
      this.allowedTestCpfs.includes(input.cpf)
    );
  }
}

export const loginService = new LoginService(
  new SequelizeLoginPersistence(),
  env.ALLOWED_PARTICIPANT_CODES,
  env.ALLOWED_TEST_CPFS,
);

