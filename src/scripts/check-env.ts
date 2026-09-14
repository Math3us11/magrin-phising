import { existsSync } from 'node:fs';
import path from 'node:path';

async function checkEnvironment(): Promise<void> {
  const envPath = path.join(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    throw new Error('Arquivo .env ausente. Execute: cp .env.example .env');
  }

  const { env } = await import('../config/env.js');
  const issues: string[] = [];

  if (env.DB_PASSWORD === 'change-me') {
    issues.push('troque DB_PASSWORD pela senha do MariaDB local');
  }

  if (env.ADMIN_API_TOKEN === 'troque-este-token-administrativo-local') {
    issues.push('troque ADMIN_API_TOKEN por um segredo local');
  }

  const fromMatch = env.EMAIL_FROM.match(/<([^<>]+)>$/);
  const fromAddress = (fromMatch?.[1] ?? env.EMAIL_FROM).toLowerCase();
  const smtpIdentityMatches =
    env.EMAIL_MODE !== 'smtp' ||
    fromAddress === env.SMTP_USER.trim().toLowerCase();

  if (!smtpIdentityMatches) {
    issues.push('EMAIL_FROM deve usar o mesmo endereco de SMTP_USER');
  }

  console.info('Configuracao carregada sem exibir valores sensiveis:');
  console.info(`- aplicacao: ${env.HOST}:${env.PORT}`);
  console.info(
    `- MariaDB: ${env.DB_HOST}:${env.DB_PORT}/${env.DB_DATABASE}`,
  );
  console.info(`- modo de e-mail: ${env.EMAIL_MODE}`);
  console.info(
    `- credenciais SMTP: ${env.SMTP_USER && env.SMTP_PASSWORD ? 'configuradas' : 'nao configuradas'}`,
  );
  console.info(
    `- identidade SMTP consistente: ${smtpIdentityMatches ? 'sim' : 'nao'}`,
  );
  console.info(
    `- destinatarios predefinidos: ${env.EMAIL_RECIPIENT_ALLOWLIST.length}`,
  );
  console.info(
    `- autorizacao temporaria: ${env.ALLOW_RUNTIME_RECIPIENT_AUTHORIZATION ? 'habilitada' : 'desabilitada'}`,
  );
  console.info(
    `- codigos de participante: ${env.ALLOWED_PARTICIPANT_CODES.length}`,
  );
  console.info(`- CPFs ficticios permitidos: ${env.ALLOWED_TEST_CPFS.length}`);

  if (issues.length > 0) {
    console.error('\nAjustes necessarios:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.info('\nAmbiente pronto para os comandos do projeto.');
}

checkEnvironment().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Configuracao de ambiente invalida.';
  console.error(`Falha ao validar o ambiente: ${message}`);
  process.exitCode = 1;
});
