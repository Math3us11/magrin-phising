import { describe, expect, it } from 'vitest';

import { buildSimulationEmail } from '../src/modules/email/email.template';

describe('buildSimulationEmail', () => {
  it('mantem a identificacao academica e o codigo individual no link', () => {
    const email = buildSimulationEmail(
      {
        participantCode: 'P001',
        recipient: 'participante@example.test',
      },
      'simulacao@example.test',
      'http://localhost:3000',
    );

    expect(email.subject).toContain('Simulacao Academica');
    expect(email.text).toContain('SIMULACAO ACADEMICA');
    expect(email.html).toContain('Simulação Acadêmica');
    expect(email.html).toContain('p=P001');
    expect(email.html).toContain('cid:logo-simulacao-academica');
    expect(email.attachments).toEqual([
      expect.objectContaining({
        filename: 'afya-logo-white.png',
        cid: 'logo-simulacao-academica',
        contentDisposition: 'inline',
      }),
    ]);
  });

  it('recusa codigo de participante fora do formato de teste', () => {
    expect(() =>
      buildSimulationEmail(
        {
          participantCode: 'cpf-real',
          recipient: 'participante@example.test',
        },
        'simulacao@example.test',
        'http://localhost:3000',
      ),
    ).toThrow('Codigo de participante invalido.');
  });
});
