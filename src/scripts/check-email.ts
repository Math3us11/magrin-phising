import { env } from '../config/env';

function checkEmailConfiguration(): void {
  console.info('Configuracao de e-mail carregada sem exibir segredos:');
  console.info(`- modo: ${env.EMAIL_MODE}`);
  console.info(`- servidor SMTP: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
  console.info(`- conexao segura direta: ${env.SMTP_SECURE ? 'sim' : 'nao'}`);
  console.info(`- usuario SMTP configurado: ${env.SMTP_USER ? 'sim' : 'nao'}`);
  console.info(
    `- senha SMTP configurada: ${env.SMTP_PASSWORD ? 'sim' : 'nao'}`,
  );
  console.info(
    `- destinatarios autorizados: ${env.EMAIL_RECIPIENT_ALLOWLIST.length}`,
  );
  console.info(
    `- participantes autorizados: ${env.ALLOWED_PARTICIPANT_CODES.join(', ')}`,
  );
  console.info('- token administrativo configurado: sim');
  console.info(
    `- autorizacao temporaria de voluntarios: ${env.ALLOW_RUNTIME_RECIPIENT_AUTHORIZATION ? 'habilitada' : 'desabilitada'}`,
  );
  console.info(
    `- validade da autorizacao temporaria: ${env.RUNTIME_RECIPIENT_AUTHORIZATION_TTL_SECONDS} segundos`,
  );
  console.info(`- endereco da aplicacao: ${env.SIMULATION_BASE_URL}`);

  if (env.EMAIL_MODE === 'disabled') {
    throw new Error('O envio continua desabilitado em EMAIL_MODE.');
  }

  if (env.EMAIL_RECIPIENT_ALLOWLIST.length === 0) {
    throw new Error('EMAIL_RECIPIENT_ALLOWLIST esta vazia.');
  }
}

try {
  checkEmailConfiguration();
  console.info('Configuracao pronta para uma tentativa de envio autorizada.');
} catch (error) {
  const message = error instanceof Error ? error.message : 'Configuracao invalida.';
  console.error(`Falha: ${message}`);
  process.exitCode = 1;
}
