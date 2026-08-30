import 'dotenv/config';

import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const csvList = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );

const senderMailbox = z.string().trim().refine((value) => {
  if (value.includes('\r') || value.includes('\n')) {
    return false;
  }

  if (z.string().email().safeParse(value).success) {
    return true;
  }

  const mailboxMatch = value.match(/^[^<>]+<([^<>\s]+)>$/);
  return Boolean(
    mailboxMatch?.[1] && z.string().email().safeParse(mailboxMatch[1]).success,
  );
}, 'Remetente deve ser um e-mail ou Nome <email>.');

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),

    DB_DIALECT: z.literal('mariadb').default('mariadb'),
    DB_HOST: z.string().min(1).default('localhost'),
    DB_PORT: z.coerce.number().int().positive().max(65_535).default(3306),
    DB_DATABASE: z.string().min(1),
    DB_USERNAME: z.string().min(1),
    DB_PASSWORD: z.string(),
    DB_LOGGING: booleanFromString,
    DB_SYNC: booleanFromString,

    EMAIL_MODE: z.enum(['disabled', 'mailpit', 'smtp']).default('disabled'),
    SMTP_HOST: z.string().min(1).default('127.0.0.1'),
    SMTP_PORT: z.coerce.number().int().positive().max(65_535).default(1025),
    SMTP_SECURE: booleanFromString,
    SMTP_USER: z.string().default(''),
    SMTP_PASSWORD: z.string().default(''),
    EMAIL_FROM: senderMailbox,
    SIMULATION_BASE_URL: z.string().url(),
    EMAIL_RECIPIENT_ALLOWLIST: csvList(''),
    ADMIN_API_TOKEN: z.string().min(24),
    ALLOW_RUNTIME_RECIPIENT_AUTHORIZATION: booleanFromString,
    RUNTIME_RECIPIENT_AUTHORIZATION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(900)
      .default(300),

    ALLOWED_PARTICIPANT_CODES: csvList('P001,P002,P003'),
    ALLOWED_TEST_CPFS: csvList('00000000000,11111111111,22222222222'),
  })
  .superRefine((value, context) => {
    if (
      value.EMAIL_MODE === 'smtp' &&
      (!value.SMTP_USER || !value.SMTP_PASSWORD)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_USER'],
        message: 'SMTP externo exige usuario e senha de aplicativo.',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const invalidFields = parsed.error.issues
    .map((issue) => issue.path.join('.'))
    .filter(Boolean)
    .join(', ');

  throw new Error(`Configuracao de ambiente invalida: ${invalidFields}`);
}

export const env = parsed.data;
