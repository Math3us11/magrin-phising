import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

import { env } from '../config/env';
import { disconnectDatabase } from '../database/sequelize';
import { demoResetService } from '../modules/admin/demo-reset.service';

const REQUIRED_CONFIRMATION = 'RESETAR DEMONSTRACAO';

async function resetDemoDatabase(): Promise<void> {
  const terminal = createInterface({ input: stdin, output: stdout });

  try {
    const summary = await demoResetService.getSummary();

    console.info('\n=== Limpeza dos dados da Simulação Acadêmica ===\n');
    console.info(`Banco: ${env.DB_DATABASE} em ${env.DB_HOST}:${env.DB_PORT}`);
    console.info(`Eventos de auditoria: ${summary.auditEvents}`);
    console.info(`Submissões mascaradas: ${summary.submissions}`);

    if (summary.auditEvents === 0 && summary.submissions === 0) {
      console.info('\nO banco da demonstração já está vazio.');
      return;
    }

    console.info(
      '\nEsta ação apaga somente os registros de audit e submissions.',
    );
    console.info('O banco e as tabelas serão preservados.');

    const confirmation = await terminal.question(
      `Digite ${REQUIRED_CONFIRMATION} para continuar: `,
    );

    if (confirmation.trim() !== REQUIRED_CONFIRMATION) {
      console.info('Limpeza cancelada. Nenhum registro foi removido.');
      return;
    }

    const result = await demoResetService.reset({
      confirmation: REQUIRED_CONFIRMATION,
    });

    console.info('\nDemonstração reiniciada com sucesso:');
    console.info(`- eventos removidos: ${result.auditEventsDeleted}`);
    console.info(`- submissões removidas: ${result.submissionsDeleted}`);
    console.info('- estrutura do banco preservada');
  } catch {
    console.error(
      'Não foi possível limpar a demonstração. Verifique o MariaDB e o .env.',
    );
    process.exitCode = 1;
  } finally {
    terminal.close();
    await disconnectDatabase().catch(() => undefined);
  }
}

void resetDemoDatabase();
