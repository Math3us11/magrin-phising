import { describe, expect, it } from 'vitest';

import { buildSimulationEmail } from '../src/modules/email/email.template';

const LOGIN_URL = 'http://localhost:3000/login?p=tok-abc-123';

describe('buildSimulationEmail', () => {
  it('usa o link por token e a marca ficticia do laboratorio', () => {
    const email = buildSimulationEmail(
      {
        participantCode: 'P001',
        recipient: 'participante@example.test',
      },
      'simulacao@example.test',
      LOGIN_URL,
    );

    expect(email.subject).toContain('Simulacao Academica');
    expect(email.html).toContain('Simulação Acadêmica');
    expect(email.html).toContain(LOGIN_URL);
    expect(email.html).toContain('Sentinela Acadêmica');
    // Nao deve reproduzir marca de terceiro.
    expect(email.html.toLowerCase()).not.toContain('afya');
    expect(email.attachments).toEqual([]);
  });

  it('expoe o codigo opaco do participante, nunca o token no corpo visivel', () => {
    const email = buildSimulationEmail(
      {
        participantCode: 'P001',
        recipient: 'participante@example.test',
      },
      'simulacao@example.test',
      LOGIN_URL,
    );

    expect(email.text).toContain('Codigo do participante: P001');
  });

  it('recusa codigo de participante fora do formato de teste', () => {
    expect(() =>
      buildSimulationEmail(
        {
          participantCode: 'cpf-real',
          recipient: 'participante@example.test',
        },
        'simulacao@example.test',
        LOGIN_URL,
      ),
    ).toThrow('Codigo de participante invalido.');
  });
});
