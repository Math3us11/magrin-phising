# AGENTS.md

## Escopo

Estas instrucoes valem para todo o repositorio.

## Objetivo do projeto

Construir uma simulacao academica e controlada de phishing para a disciplina de
Seguranca e Auditoria de Sistemas. O sistema demonstra o fluxo:

1. envio de e-mail de teste;
2. acesso a uma pagina de login simulada;
3. registro da interacao;
4. exibicao de um boleto ficticio;
5. conscientizacao do participante;
6. visualizacao de metricas em um dashboard de auditoria.

O ambiente pode ser visualmente realista, mas participantes, credenciais,
documentos e dados financeiros devem ser ficticios. A aplicacao nao e uma
ferramenta de phishing para uso externo.

## Regras obrigatorias de seguranca e etica

- Executar somente em ambiente local, laboratorio ou rede academica autorizada.
- Nao publicar a aplicacao em servidor publico.
- Permitir apenas participantes previamente autorizados para a demonstracao.
- Utilizar exclusivamente CPF, senha, boleto e demais dados ficticios.
- Exibir o texto `Simulacao Academica` permanentemente no e-mail e nas paginas.
- Nao imitar um remetente institucional real nem falsificar dominio ou cabecalho
  `From`.
- Nao armazenar CPF completo nem qualquer caractere da senha digitada.
- Mascarar os dados no backend antes de qualquer `INSERT`.
- Nao registrar `req.body`, CPF, senha, cookies ou segredos em logs.
- Manter envio externo desabilitado por padrao.
- Limitar destinatarios externos a uma allowlist explicitamente configurada.
- Oferecer uma forma de limpar os dados da demonstracao ao termino da atividade.
- Nunca transformar a simulacao em coleta oculta de credenciais reais.

Se uma solicitacao futura entrar em conflito com essas regras, interromper a
implementacao dessa parte e explicar o conflito.

## Stack base

- Backend: Node.js com TypeScript e Express.
- Frontend: HTML, CSS e JavaScript sem framework.
- Banco: MariaDB ou MySQL.
- Driver SQL: `mysql2` com queries parametrizadas.
- E-mail: Nodemailer por meio de uma abstracao de transporte.
- Transporte padrao: Mailpit local.
- Validacao: Zod ou validacao equivalente no servidor.
- Desenvolvimento: `tsx` e TypeScript em modo estrito.

Caso o professor nao autorize Express, substituir apenas a camada HTTP por
`node:http`, preservando rotas, servicos, banco e regras deste documento.

## Arquitetura esperada

Manter uma arquitetura simples, sem criar camadas que nao sejam necessarias para
a demonstracao:

```text
src/
  config/
  db/
  routes/
  services/
  utils/
  server.ts
public/
  css/
  js/
  images/
  login.html
  boleto.html
  awareness.html
  dashboard.html
database/
  schema.sql
docs/
  EXECUCAO.md
```

Responsabilidades:

- `routes`: receber requisicoes e devolver respostas/redirecionamentos.
- `services`: envio de e-mail, registro de eventos e calculo de metricas.
- `db`: conexao e queries parametrizadas.
- `utils`: mascaramento e validacao de dados ficticios.
- `public`: telas estaticas e scripts do navegador.

Nao colocar regra de negocio diretamente nos arquivos HTML.

## Modelo de dados

Usar somente duas tabelas: `audit` e `submissions`.

Eventos permitidos em `audit`:

- `email_sent`
- `link_clicked`
- `form_submitted`

Cada participante e evento deve contar no maximo uma vez. O identificador
`participant_code` e um codigo opaco de teste, como `P001`; ele nao e uma
credencial e nao deve conter nome, e-mail ou CPF.

Em `submissions`:

- salvar CPF no formato `***.***.***-09`;
- salvar senha como texto fixo, por exemplo `[8 caracteres capturados]`;
- nunca salvar o valor integral, mesmo quando ficticio;
- manter no maximo uma submissao por participante.

## Rotas planejadas

- `GET /health`: verificar aplicacao e banco.
- `POST /admin/send`: enviar apenas para a allowlist e registrar `email_sent`.
- `GET /login?p=P001`: registrar `link_clicked` uma vez e exibir o login.
- `POST /login`: validar, mascarar, salvar e registrar `form_submitted`.
- `GET /boleto`: exibir boleto integralmente ficticio.
- `GET /awareness`: explicar a simulacao e os sinais de phishing.
- `GET /admin/dashboard`: exibir metricas agregadas e registros mascarados.
- `POST /admin/reset-demo`: limpar somente os dados da demonstracao, com
  confirmacao explicita e protegido por autenticacao administrativa.

Rotas administrativas devem exigir autenticacao e nao podem ficar expostas sem
controle de acesso.

## Metricas do dashboard

Calcular sempre com participantes unicos:

- e-mails enviados;
- pessoas que clicaram;
- pessoas que enviaram o formulario;
- taxa de clique: `clicked / sent * 100`;
- taxa de submissao: `submitted / sent * 100`;
- conversao apos clique: `submitted / clicked * 100`.

Tratar divisao por zero e atualizacao repetida da pagina.

## Convencoes de implementacao

- Ativar `strict: true` no TypeScript.
- Validar dados no servidor; validacao do navegador e apenas auxiliar.
- Usar queries parametrizadas; nunca interpolar entrada do usuario no SQL.
- Nao retornar erros internos, SQL ou stack traces ao navegador.
- Manter segredos apenas em variaveis de ambiente e fornecer `.env.example` sem
  valores reais.
- Nao versionar `.env`, senhas de aplicativo, chaves SMTP ou listas reais de
  destinatarios.
- Usar funcoes pequenas e nomes claros em portugues ou ingles, sem misturar os
  dois estilos no mesmo modulo.
- Comentar decisoes de seguranca e trechos nao obvios; evitar comentarios que
  apenas repetem o codigo.
- Preservar o frontend sem framework ate nova autorizacao do professor.

## Testes minimos

Antes de considerar uma alteracao concluida, verificar:

1. CPF completo nao aparece no banco nem nos logs.
2. Senha digitada nao aparece no banco nem nos logs.
3. O mesmo participante nao aumenta a mesma metrica ao atualizar a pagina.
4. Participante sem codigo valido nao e registrado.
5. Destinatario fora da allowlist nao recebe e-mail.
6. Envio externo permanece desligado quando nao configurado explicitamente.
7. Dashboard trata banco vazio e divisao por zero.
8. Banner `Simulacao Academica` aparece em todas as telas relevantes.
9. Boleto, CPF, valores, vencimento e beneficiario sao ficticios.
10. Rotas administrativas recusam acesso nao autenticado.

Executar os scripts de lint, testes e build existentes antes da entrega. Se o
repositorio ainda nao possuir esses scripts, cria-los durante o scaffold e
documenta-los em `docs/EXECUCAO.md`.

## Criterio de pronto

Uma funcionalidade so esta pronta quando:

- funciona no fluxo local completo;
- respeita as regras de seguranca acima;
- possui tratamento de erro compreensivel;
- possui teste proporcional ao risco;
- nao expande o modelo de dados sem necessidade;
- tem seu modo de execucao atualizado em `docs/EXECUCAO.md`.

