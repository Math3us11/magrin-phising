# Plano de implementacao e execucao

## 1. Finalidade

Este documento descreve como construir, configurar, executar e apresentar a
simulacao academica de phishing.

O projeto sera funcional: enviara mensagens de teste, registrara cliques e
submissoes e mostrara os resultados em um dashboard. Entretanto, todo dado
utilizado deve ser ficticio e todos os participantes devem estar dentro do teste
autorizado.

## 2. Escopo funcional

O produto minimo deve conter:

1. uma area administrativa para iniciar a simulacao;
2. envio de e-mails para uma lista autorizada;
3. uma pagina de login simulada;
4. captura segura de CPF e senha ficticios;
5. um boleto totalmente ficticio;
6. uma tela de conscientizacao;
7. um dashboard com metricas basicas;
8. uma opcao administrativa para limpar a demonstracao.

Nao fazem parte do escopo:

- cadastro completo de alunos;
- integracao com sistemas da instituicao;
- autenticacao institucional real;
- publicacao aberta na internet;
- coleta de CPF ou senha verdadeiros;
- campanhas para pessoas nao autorizadas;
- rastreamento por IP, geolocalizacao ou fingerprint do navegador.

## 3. Stack proposta

| Camada | Tecnologia | Motivo |
| --- | --- | --- |
| Backend | Node.js, TypeScript e Fastify | Servidor leve, modular e simples de demonstrar |
| Frontend | HTML, CSS e JavaScript | Nao depende da aprovacao de framework frontend |
| Banco | MariaDB ou MySQL | Banco relacional conhecido pelo grupo |
| ORM | Sequelize com driver mariadb | Modelos simples e consultas sem SQL interpolado |
| E-mail | Nodemailer | Permite alternar entre SMTP local e autorizado |
| Desenvolvimento | tsx | Executa TypeScript durante o desenvolvimento |
| Validacao | Zod | Centraliza regras de validacao do servidor |
| E-mail local | Mailpit | Mantem mensagens dentro do laboratorio |

Fastify e Sequelize formam a stack inicial confirmada para o servidor. O
frontend permanece sem framework na primeira versao.

### Estado atual do repositorio

Implementado neste primeiro incremento:

- servidor Fastify com `GET /` e `GET /health`;
- configuracao validada por variaveis de ambiente;
- conexao MariaDB por Sequelize com pool limitado;
- modelos Sequelize `Audit` e `Submission`;
- comando idempotente `npm run db` para criar o banco e aplicar o schema;
- comandos auxiliares `db:check`, `db:init` e `db:setup`;
- template de e-mail permanentemente identificado como simulacao;
- servico de e-mail desabilitado por padrao e preparado para Mailpit;
- `POST /admin/send` protegido por token, limitado por allowlists e com envio
  idempotente por participante;
- transportes Mailpit e SMTP externo separados por `EMAIL_MODE`;
- registro de `email_sent` somente depois da confirmacao do transporte;
- tela responsiva de login em `GET /login?p=P001`, baseada na referencia visual
  e nos arquivos de imagem fornecidos para a demonstracao;
- `POST /login` com validacao de allowlists, mascaramento no backend e transacao
  Sequelize;
- registro idempotente de `link_clicked` e `form_submitted`;
- persistencia exclusiva de CPF mascarado e tamanho da senha;
- dashboard agregado de apresentacao em `GET /dashboard?p=P001`;
- API de metricas em `GET /api/dashboard/metrics`;
- limpeza protegida em `POST /admin/reset-demo` e `npm run db:reset`;
- testes do template de e-mail, da pagina e dos arquivos estaticos.

Ainda nao implementado:

- boleto e conscientizacao;
- dashboard administrativo detalhado e autenticacao administrativa;
- tela administrativa detalhada para iniciar os envios;

## 4. Fluxo da demonstracao

```text
Administrador inicia o envio
          |
          v
Sistema envia mensagens aos participantes autorizados
          |
          v
Participante acessa /login?p=P001
          |
          v
Sistema registra um clique unico
          |
          v
Participante informa CPF e senha de teste
          |
          v
Backend valida e mascara antes de salvar
          |
          v
Sistema registra a submissao e mostra o boleto ficticio
          |
          v
Tela final explica a simulacao e os sinais de phishing
          |
          v
Dashboard apresenta o funil e os dados mascarados
```

O codigo `P001` identifica apenas um participante do teste. Ele evita que
atualizacoes repetidas sejam contadas como novas pessoas e nao deve conter
informacoes pessoais.

## 5. Modelo de banco

Criar `database/schema.sql` com o seguinte modelo inicial:

```sql
CREATE DATABASE IF NOT EXISTS phising
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE phising;

CREATE TABLE IF NOT EXISTS audit (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    participant_code VARCHAR(50) NOT NULL,
    event_type ENUM(
        'email_sent',
        'link_clicked',
        'form_submitted'
    ) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_audit_participant_event (
        participant_code,
        event_type
    )
);

CREATE TABLE IF NOT EXISTS submissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    participant_code VARCHAR(50) NOT NULL,
    cpf_masked VARCHAR(20) NOT NULL,
    password_masked VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_submission_participant (participant_code)
);
```

Nao adicionar CPF completo, senha completa, IP, user-agent ou e-mail real a
essas tabelas.

## 6. Regras de mascaramento

### CPF

O backend deve retirar pontuacao, validar que o valor pertence ao conjunto de
CPFs ficticios da demonstracao e manter somente os dois ultimos digitos.

Exemplo:

```text
Entrada de teste: 123.456.789-09
Valor persistido: ***.***.***-09
```

Um CPF fora da lista de teste deve ser recusado sem ser incluido em logs ou no
banco.

### Senha

O backend nao deve preservar nenhum caractere. Salvar apenas uma descricao do
tamanho recebido:

```text
Entrada de teste: teste123
Valor persistido: [8 caracteres capturados]
```

O dashboard mostra que uma senha foi capturada, mas nao permite recupera-la.

## 7. Eventos e metricas

Registrar os eventos abaixo com insercao idempotente:

| Evento | Momento do registro |
| --- | --- |
| `email_sent` | Depois que o transporte confirma o envio |
| `link_clicked` | No primeiro acesso valido ao link |
| `form_submitted` | Depois que a submissao mascarada e salva |

A chave unica de `audit` impede que o mesmo participante conte duas vezes para o
mesmo evento.

O dashboard deve apresentar:

- total de e-mails enviados;
- total de participantes que clicaram;
- total de participantes que enviaram o formulario;
- taxa de clique;
- taxa de submissao;
- conversao entre clique e submissao;
- funil visual com os tres totais;
- tabela de submetidos com codigo, CPF mascarado, senha mascarada e horario.

Formulas:

```text
taxa de clique = clicked / sent * 100
taxa de submissao = submitted / sent * 100
conversao apos clique = submitted / clicked * 100
```

Quando o denominador for zero, mostrar `0%`.

## 8. Estrutura prevista do projeto

```text
magrin-phising/
  AGENTS.md
  package.json
  tsconfig.json
  .env.example
  .gitignore
  database/
    schema.sql
  docs/
    EXECUCAO.md
  public/
    css/
      styles.css
    js/
      login.js
      dashboard.js
    images/
    login.html
    boleto.html
    awareness.html
    dashboard.html
  src/
    config/
      env.ts
    database/
      sequelize.ts
      models/
        audit.model.ts
        submission.model.ts
        index.ts
    modules/
      email/
        email.service.ts
        email.template.ts
        email.types.ts
      health/
        health.route.ts
    scripts/
      check-db.ts
      init-db.ts
    app.ts
    server.ts
  tests/
```

## 9. Implementacao por etapas

### Etapa 1 - Scaffold

1. Inicializar o projeto Node.
2. Instalar TypeScript e `tsx`.
3. Ativar `strict: true` no `tsconfig.json`.
4. Criar a estrutura de diretorios.
5. Configurar `.gitignore` para ignorar `.env`, logs e dependencias.
6. Criar `.env.example` sem nenhum segredo verdadeiro.
7. Executar `npm run env:check` depois de configurar uma nova maquina.

Dependencias planejadas:

```powershell
npm install fastify sequelize mariadb nodemailer zod dotenv
npm install --save-dev typescript tsx vitest `
  @types/node @types/nodemailer
```

Scripts esperados em `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db": "npm run db:setup",
    "db:check": "npm run build --silent && node dist/scripts/check-db.js",
    "db:init": "npm run db:setup",
    "db:setup": "npm run build --silent && node dist/scripts/setup-db.js",
    "lint": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

### Etapa 2 - Banco

1. Subir o MariaDB localmente.
2. Configurar a conexao no `.env`.
3. Executar `npm run db` para criar o banco e somente as tabelas ausentes.
4. Executar `npm run db:check` quando quiser testar apenas a conexao.
5. Antes da entrega, criar um usuario de banco exclusivo para a aplicacao.
6. Conceder apenas os privilegios necessarios nas duas tabelas.
7. Usar a instancia Sequelize com pool limitado.
8. Preferir metodos do ORM e usar parametros vinculados em eventual SQL bruto.

### Etapa 3 - Registro de eventos

1. Validar `participant_code` no formato esperado.
2. Registrar `email_sent`, `link_clicked` e `form_submitted`.
3. Ignorar duplicatas sem retornar erro ao participante.
4. Criar consultas agregadas para o dashboard.
5. Testar banco vazio e eventos repetidos.

### Etapa 4 - Login simulado

1. Criar a tela responsiva de login.
2. Mostrar `Simulacao Academica` permanentemente.
3. Receber o codigo `p` da URL.
4. Registrar o primeiro acesso valido.
5. Enviar CPF e senha de teste por `POST`.
6. Validar os dados no backend.
7. Mascarar antes de persistir.
8. Redirecionar para o boleto ficticio.

Nao utilizar logotipo ou dominio institucional sem a autorizacao especifica
necessaria. Se essa autorizacao nao existir, usar marca ficticia.

### Etapa 5 - Boleto e conscientizacao

1. Criar boleto apenas visual; ele nao deve ser pagavel.
2. Usar beneficiario, documento, valor, vencimento e codigo de barras ficticios.
3. Nao gerar linha digitavel valida.
4. Exibir o aviso educativo de forma clara.
5. Listar sinais presentes no e-mail e na pagina que indicam phishing.

### Etapa 6 - Dashboard

1. Proteger a rota administrativa.
2. Criar cards para enviados, cliques, submissoes e taxa de submissao.
3. Criar um funil simples.
4. Mostrar somente dados mascarados.
5. Atualizar os numeros por botao ou polling moderado.
6. Tratar indisponibilidade do banco e estado vazio.
7. Limpar a demonstracao com confirmacao explicita quando for necessario
   repetir o fluxo.

### Etapa 7 - E-mail local

1. Subir Mailpit localmente.
2. Configurar Nodemailer para o SMTP do Mailpit.
3. Enviar uma mensagem para cada participante ficticio.
4. Incluir o codigo individual no link.
5. Incluir o banner textual `Simulacao Academica` na mensagem.
6. Confirmar que nenhum e-mail sai para a internet nesse modo.

Configuracao para o Mailpit local:

```dotenv
EMAIL_MODE=mailpit
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=simulacao-academica@example.test
EMAIL_RECIPIENT_ALLOWLIST=participante@example.test
```

O endereco usado com Mailpit nao precisa existir, pois a mensagem fica retida no
laboratorio e pode ser visualizada na interface local do Mailpit.

### Etapa 8 - E-mail externo opcional

Habilitar somente depois da confirmacao do professor e da definicao dos
participantes autorizados.

1. Criar uma conta dedicada com nome neutro, por exemplo
   `simulacao.seguranca.grupo@...`.
2. Nao usar endereco que pareca pertencer oficialmente a Afya.
3. Usar o transporte SMTP externo separado e configura-lo por variaveis de
   ambiente.
4. Manter `EMAIL_MODE=disabled` como padrao.
5. Nao reutilizar o transporte Mailpit como transporte externo.
6. Recusar destinatarios ausentes da allowlist.
7. Aplicar limite de um envio por participante.
8. Nao inserir chave, senha de aplicativo ou destinatarios reais no repositorio.

Provedores externos podem bloquear conteudo semelhante a phishing. Consultar a
politica do provedor antes do teste e preferir infraestrutura institucional
explicitamente autorizada quando for necessaria entrega real.

Exemplo para uma conta Gmail dedicada ao teste, usando SSL na porta 465:

```dotenv
EMAIL_MODE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=seu-email-de-teste@gmail.com
SMTP_PASSWORD=senha-de-aplicativo
EMAIL_FROM=seu-email-de-teste@gmail.com
EMAIL_RECIPIENT_ALLOWLIST=seu-proprio-email@gmail.com
```

Nao usar a senha normal da conta. Para SMTP autenticado, gerar uma senha de
aplicativo e mante-la somente no `.env`. A conta Google precisa ter verificacao
em duas etapas para disponibilizar senhas de aplicativo. Algumas contas
institucionais podem impedir esse recurso por politica do administrador.

## 10. Variaveis de ambiente atuais

O `.env.example` contem apenas exemplos seguros. A senha real fica somente no
`.env` ignorado pelo Git:

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PORT=3000

DB_DIALECT=mariadb
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=phising
DB_USERNAME=root
DB_PASSWORD=change-me
DB_LOGGING=false
DB_SYNC=false

EMAIL_MODE=disabled
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=simulacao-academica@example.test
SIMULATION_BASE_URL=http://localhost:3000
EMAIL_RECIPIENT_ALLOWLIST=participante@example.test
ADMIN_API_TOKEN=troque-este-token-administrativo-local
ALLOW_RUNTIME_RECIPIENT_AUTHORIZATION=false
RUNTIME_RECIPIENT_AUTHORIZATION_TTL_SECONDS=300
```

## 11. Execucao local prevista

Os comandos abaixo usam a instalacao local do MariaDB. O arquivo `.env` nunca
deve ser versionado.

### Primeira execucao no Bash

```bash
cp .env.example .env
npm install
npm run env:check
npm run db
npm run dev
```

Antes de `npm run db`, editar no `.env` pelo menos `DB_HOST`, `DB_PORT`,
`DB_DATABASE`, `DB_USERNAME` e `DB_PASSWORD`. O comando:

1. conecta ao servidor MariaDB sem depender da existencia previa do banco;
2. cria `DB_DATABASE` com UTF-8 quando ele ainda nao existe;
3. cria as tabelas `audit` e `submissions` quando estiverem ausentes;
4. preserva banco, tabelas e registros que ja existirem;
5. verifica as duas tabelas e informa se o ambiente esta pronto.

`npm run db:init` e `npm run db:setup` executam o mesmo procedimento. O atalho
recomendado para a apresentacao e `npm run db`.

Abrir:

```text
Aplicacao:       http://localhost:3000
Saude do servidor: http://localhost:3000/health
Login de teste:  http://localhost:3000/login?p=P001
Dashboard:       http://localhost:3000/dashboard?p=P001
```

### Enviar um e-mail autorizado

1. Configurar no `.env` o transporte, o remetente e o destinatario permitido.
2. Reiniciar a aplicacao depois de alterar o `.env`.
3. Em um segundo terminal Bash, validar a configuracao sem exibir os segredos:

```bash
npm run email:check
```

4. Abrir o assistente interativo, informar os dados e confirmar o envio:

```bash
npm run email:send
```

O assistente solicita o codigo do participante e o destinatario, mostra um
resumo com o e-mail mascarado e somente envia depois da confirmacao `s`.

Destinatarios da allowlist fixa seguem diretamente para a confirmacao final. Um
endereco diferente pode ser autorizado temporariamente para um voluntario quando
`ALLOW_RUNTIME_RECIPIENT_AUTHORIZATION=true`. Nesse caso o operador precisa
digitar `AUTORIZADO` para declarar o consentimento e depois confirmar o envio.
A permissao fica apenas na memoria do servidor, e vinculada ao participante,
expira em 300 segundos e e consumida depois de uma unica tentativa confirmada.
O endereco nao e salvo no banco, em arquivo ou no `.env`.

Exemplo do fluxo temporario:

```text
Codigo do participante [P001]: P002
Enviar e-mail para (Enter usa a allowlist fixa): voluntario@example.com
O voluntario autorizou o teste? Digite AUTORIZADO: AUTORIZADO

Confira antes do envio:
- participante: P002
- destinatario: vo***@example.com
- autorizacao: temporaria, uso unico

Confirmar envio? [s/N]: s
```

Somente codigos presentes em `ALLOWED_PARTICIPANT_CODES` podem usar esse fluxo.
O modo SMTP, o token administrativo e a confirmacao final continuam
obrigatorios. A autorizacao temporaria e desabilitada por padrao no
`.env.example`.

Para automacao, o modo anterior com argumentos continua disponivel. Se houver
apenas um destinatario na allowlist, basta informar o participante:

```bash
npm run email:send -- P001
```

Se houver mais de um destinatario autorizado, o endereco pode ser informado
como segundo argumento e ainda sera validado contra a allowlist:

```bash
npm run email:send -- P001 participante-autorizado@example.test
```

O servidor iniciado por `npm run dev` precisa continuar ativo em outro
terminal. O comando nunca imprime o token ou a senha SMTP; no modo interativo,
o destinatario aparece mascarado apenas para confirmacao.

Respostas esperadas:

- `201` e `status: sent`: transporte confirmou e `email_sent` foi registrado;
- `200` e `status: already_sent`: o participante ja recebeu a mensagem;
- `400`: participante ou destinatario esta fora da allowlist;
- `401`: token administrativo ausente ou incorreto;
- `503`: `EMAIL_MODE=disabled`;
- `502`: o SMTP nao confirmou o envio.

O sistema nao armazena o endereco destinatario. O banco recebe apenas o codigo
opaco do participante e o evento `email_sent`. Para repetir um ensaio com
`P001`, use a rotina administrativa; nao remova registros manualmente durante a
apresentacao.

### Limpar a demonstracao

Para apagar somente os registros de `audit` e `submissions`, preservando o
banco e as tabelas:

```bash
npm run db:reset
```

O comando mostra quantos registros existem e exige a frase exata:

```text
RESETAR DEMONSTRACAO
```

Qualquer outra resposta cancela a operacao. A mesma funcionalidade esta
disponivel em `POST /admin/reset-demo`, protegida por Bearer Token e pelo corpo:

```json
{
  "confirmation": "RESETAR DEMONSTRACAO"
}
```

Se o link for aberto no mesmo computador do servidor, mantenha
`SIMULATION_BASE_URL=http://localhost:3000`. Em outro aparelho, `localhost`
apontaria para o proprio aparelho; nesse caso use apenas um endereco da rede
local autorizada e nunca publique a aplicacao abertamente.

### Execucoes seguintes

```bash
npm run db
npm run dev
```

### Verificacoes antes da apresentacao

```powershell
npm test
npm run build
```

## 12. Roteiro operacional da apresentacao

1. Iniciar banco, e-mail local e aplicacao.
2. Confirmar que o dashboard esta zerado.
3. Confirmar que todos utilizarao credenciais ficticias fornecidas pelo grupo.
4. Iniciar o envio controlado.
5. Mostrar o total de mensagens enviadas.
6. Permitir que os participantes acessem o link.
7. Acompanhar a taxa de clique no dashboard.
8. Permitir o preenchimento com os dados ficticios.
9. Mostrar o boleto e a tela educativa.
10. Exibir os dados mascarados e explicar o fluxo tecnico.
11. Apresentar medidas de prevencao contra phishing.
12. Limpar os registros da demonstracao.

## 13. Checklist final

- [ ] Professor confirmou a stack e o uso de frameworks.
- [ ] Participantes e teste estao autorizados.
- [ ] Todos receberam CPF e senha ficticios.
- [ ] Banner de simulacao aparece permanentemente.
- [ ] Identidade visual utilizada esta autorizada ou e ficticia.
- [ ] Aplicacao nao esta publicada na internet.
- [ ] Envio esta limitado a allowlist.
- [ ] Banco possui somente `audit` e `submissions`.
- [ ] CPF completo nao aparece no banco nem nos logs.
- [ ] Senha digitada nao aparece no banco nem nos logs.
- [ ] Cliques repetidos nao inflam as metricas.
- [ ] Dashboard trata banco vazio.
- [ ] Boleto nao possui dados ou linha digitavel validos.
- [ ] Rotas administrativas estao protegidas.
- [ ] Segredos nao foram versionados.
- [ ] Testes e build foram executados.
- [ ] Limpeza pos-demonstracao foi validada.
