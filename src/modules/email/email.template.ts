import path from 'node:path';

import type {
  SimulationEmailContent,
  SimulationEmailInput,
} from './email.types';

const PARTICIPANT_CODE_PATTERN = /^P\d{3,6}$/;
const LOGO_CID = 'logo-simulacao-academica';
const logoPath = path.join(
  process.cwd(),
  'public',
  'assets',
  'images',
  'afya-logo-white.png',
);

export function buildSimulationEmail(
  input: SimulationEmailInput,
  from: string,
  baseUrl: string,
): SimulationEmailContent {
  if (!PARTICIPANT_CODE_PATTERN.test(input.participantCode)) {
    throw new Error('Codigo de participante invalido.');
  }

  const loginUrl = new URL('/login', baseUrl);
  loginUrl.searchParams.set('p', input.participantCode);

  const subject = '[Simulacao Academica] Aviso financeiro de teste';
  const text = [
    'SIMULACAO ACADEMICA',
    '',
    'Aviso sobre demonstrativo financeiro de teste',
    '',
    'Identificamos uma atualizacao pendente no demonstrativo financeiro ficticio do ambiente academico.',
    `Codigo do participante: ${input.participantCode}`,
    `Acesse o ambiente de teste: ${loginUrl.toString()}`,
    '',
    'Use somente as credenciais ficticias fornecidas pelo grupo.',
    'Esta mensagem faz parte de uma atividade academica controlada.',
  ].join('\n');

  const html = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Simulação Acadêmica</title>
      </head>
      <body style="margin:0;padding:0;background-color:#ece9e6;font-family:Arial,Helvetica,sans-serif;color:#ffffff">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          Simulação Acadêmica — aviso financeiro inteiramente fictício.
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ece9e6">
          <tr>
            <td align="center" style="padding:24px 12px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#252525;border-radius:8px;overflow:hidden;box-shadow:0 12px 30px rgba(40,20,30,.18)">
                <tr>
                  <td align="center" style="background-color:#a80046;padding:11px 20px;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">
                    Simulação Acadêmica
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:34px 32px 24px;background-color:#252525;border-bottom:1px solid #414141">
                    <img src="cid:${LOGO_CID}" width="150" alt="Afya" style="display:block;width:150px;max-width:55%;height:auto;border:0">
                  </td>
                </tr>

                <tr>
                  <td style="padding:34px 42px 38px">
                    <p style="margin:0 0 8px;color:#d9d9d9;font-size:14px;line-height:1.6">
                      Olá, estudante.
                    </p>
                    <h1 style="margin:0 0 20px;color:#ffffff;font-size:25px;line-height:1.25;text-align:left">
                      Aviso sobre demonstrativo financeiro
                    </h1>
                    <p style="margin:0 0 16px;color:#ededed;font-size:16px;line-height:1.65">
                      Identificamos uma atualização pendente no demonstrativo financeiro fictício do ambiente acadêmico.
                    </p>
                    <p style="margin:0 0 28px;color:#bfbfbf;font-size:14px;line-height:1.6">
                      Para consultar os detalhes da demonstração, acesse o ambiente usando somente as credenciais fictícias fornecidas pelo grupo.
                    </p>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 28px">
                      <tr>
                        <td align="center" bgcolor="#a80046" style="border-radius:4px">
                          <a href="${loginUrl.toString()}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border:1px solid #c61a62;border-radius:4px">
                            Acessar
                          </a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#303030;border-left:4px solid #a80046;border-radius:4px">
                      <tr>
                        <td style="padding:15px 18px;color:#dedede;font-size:13px;line-height:1.55">
                          Participante <strong style="color:#ffffff">${input.participantCode}</strong><br>
                          Este código identifica apenas sua participação nesta demonstração.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:20px 30px;background-color:#1d1d1d;border-top:1px solid #383838;color:#bdbdbd;font-size:12px;line-height:1.6">
                    <strong style="color:#ffffff">Simulação Acadêmica</strong><br>
                    Mensagem fictícia enviada em uma atividade controlada de Segurança e Auditoria de Sistemas.<br>
                    Não utilize CPF ou senha reais.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();

  return {
    from,
    to: input.recipient,
    subject,
    text,
    html,
    attachments: [
      {
        filename: 'afya-logo-white.png',
        path: logoPath,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  };
}
