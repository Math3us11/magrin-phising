import { DataTypes, type QueryInterface } from 'sequelize';

/**
 * Migracao aditiva e idempotente: garante a coluna `campaign_id` nas tabelas
 * `audit` e `submissions` sem apagar dados existentes. Linhas da Fase 1
 * permanecem com `campaign_id` nulo (nao vinculadas a nenhuma campanha).
 *
 * `sequelize.sync()` cria apenas tabelas ausentes, por isso a coluna nova em
 * tabelas ja existentes precisa desta migracao explicita.
 */
async function addCampaignColumnIfMissing(
  queryInterface: QueryInterface,
  tableName: string,
): Promise<boolean> {
  const exists = await queryInterface.tableExists(tableName);

  if (!exists) {
    // A tabela sera criada pelo sync com a coluna ja definida no modelo.
    return false;
  }

  const columns = await queryInterface.describeTable(tableName);

  if (columns.campaign_id) {
    return false;
  }

  await queryInterface.addColumn(tableName, 'campaign_id', {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  });

  return true;
}

export async function ensureCampaignLink(
  queryInterface: QueryInterface,
): Promise<string[]> {
  const applied: string[] = [];

  for (const tableName of ['audit', 'submissions']) {
    if (await addCampaignColumnIfMissing(queryInterface, tableName)) {
      applied.push(`${tableName}.campaign_id`);
    }
  }

  return applied;
}
