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
| Backend | Node.js, TypeScript e Express | Stack prevista na atividade e simples de demonstrar |
| Frontend | HTML, CSS e JavaScript | Nao depende da aprovacao de framework frontend |
| Banco | MariaDB ou MySQL | Banco relacional conhecido pelo grupo |
| SQL | mysql2 | Suporte a promises e queries parametrizadas |
| E-mail | Nodemailer | Permite alternar entre SMTP local e autorizado |
| Desenvolvimento | tsx | Executa TypeScript durante o desenvolvimento |
| Validacao | Zod | Centraliza regras de validacao do servidor |
| E-mail local | Mailpit | Mantem mensagens dentro do laboratorio |

O Express pode ser trocado por `node:http` se o professor nao autorizar
frameworks de backend. O frontend permanece sem framework na primeira versao.

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
CREATE DATABASE IF NOT EXISTS phishing_simulation
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE phishing_simulation;

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
  docker-compose.yml
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
    db/
      connection.ts
      audit.repository.ts
      submissions.repository.ts
    routes/
      public.routes.ts
      admin.routes.ts
    services/
      audit.service.ts
      email.service.ts
      metrics.service.ts
    utils/
      mask.ts
      participant.ts
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

Dependencias planejadas:

```powershell
npm install express mysql2 nodemailer zod dotenv helmet express-rate-limit
npm install --save-dev typescript tsx vitest supertest `
  @types/node @types/express @types/nodemailer @types/supertest
```

Scripts esperados em `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Etapa 2 - Banco

1. Subir MariaDB/MySQL localmente.
2. Executar `database/schema.sql`.
3. Criar um usuario de banco exclusivo para a aplicacao.
4. Conceder apenas `SELECT`, `INSERT` e `DELETE` nas duas tabelas.
5. Implementar conexao por pool.
6. Implementar queries parametrizadas e idempotentes.

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
7. Implementar limpeza da demonstracao com confirmacao explicita.

### Etapa 7 - E-mail local

1. Subir Mailpit localmente.
2. Configurar Nodemailer para o SMTP do Mailpit.
3. Enviar uma mensagem para cada participante ficticio.
4. Incluir o codigo individual no link.
5. Incluir o banner textual `Simulacao Academica` na mensagem.
6. Confirmar que nenhum e-mail sai para a internet nesse modo.

### Etapa 8 - E-mail externo opcional

Habilitar somente depois da confirmacao do professor e da definicao dos
participantes autorizados.

1. Criar uma conta dedicada com nome neutro, por exemplo
   `simulacao.seguranca.grupo@...`.
2. Nao usar endereco que pareca pertencer oficialmente a Afya.
3. Configurar credencial SMTP em variavel de ambiente.
4. Manter `EMAIL_MODE=mailpit` como padrao.
5. Exigir `EMAIL_MODE=external` para permitir entrega real.
6. Recusar destinatarios ausentes da allowlist.
7. Aplicar limite de um envio por participante.
8. Nao inserir chave, senha de aplicativo ou destinatarios reais no repositorio.

Provedores externos podem bloquear conteudo semelhante a phishing. Consultar a
politica do provedor antes do teste e preferir infraestrutura institucional
explicitamente autorizada quando for necessaria entrega real.

## 10. Variaveis de ambiente previstas

O futuro `.env.example` deve conter somente nomes e exemplos seguros:

```dotenv
NODE_ENV=development
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=phishing_simulation
DB_USER=simulation_app
DB_PASSWORD=change-me

EMAIL_MODE=mailpit
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=simulacao-academica@example.test

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=replace-with-a-hash
SESSION_SECRET=replace-with-a-random-development-secret

ALLOWED_PARTICIPANT_CODES=P001,P002,P003
ALLOWED_RECIPIENTS=
```

## 11. Execucao local prevista

Os comandos abaixo passam a valer depois que os arquivos de scaffold,
`package.json`, `docker-compose.yml` e `database/schema.sql` forem criados.

### Primeira execucao

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d db mailpit
npm run dev
```

Abrir:

```text
Aplicacao:       http://localhost:3000
Dashboard:       http://localhost:3000/admin/dashboard
Caixa do Mailpit: http://localhost:8025
```

### Execucoes seguintes

```powershell
docker compose up -d db mailpit
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

