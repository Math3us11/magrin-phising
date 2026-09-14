# Simulação Acadêmica de Phishing

Aplicação acadêmica e controlada para demonstrar os riscos de phishing na
disciplina de Segurança e Auditoria de Sistemas.

O fluxo demonstra o envio de um e-mail de teste, acesso a uma página de login
simulada, mascaramento dos dados fictícios no backend e apresentação das
métricas no dashboard.

> **Uso restrito:** execute somente em ambiente local ou acadêmico autorizado,
> com participantes voluntários e dados inteiramente fictícios. Não publique a
> aplicação na internet e não utilize CPF ou senha reais.

## Tecnologias

- Node.js 22 ou superior;
- TypeScript e Fastify;
- MariaDB com Sequelize;
- HTML, CSS e JavaScript;
- Nodemailer para envio controlado de e-mail;
- Vitest para testes automatizados.

## Pré-requisitos

Antes de iniciar, instale:

- [Node.js](https://nodejs.org/) 22 ou superior;
- npm;
- MariaDB em execução no computador.

Confira as versões:

```bash
node --version
npm --version
```

## Primeira execução

Instale as dependências e crie o arquivo de configuração local:

```bash
npm install
cp .env.example .env
```

No `.env`, configure a conexão com o MariaDB:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=phising
DB_USERNAME=root
DB_PASSWORD=sua-senha-local
```

Não coloque a senha real no `.env.example`. O arquivo `.env` já está ignorado
pelo Git.

Depois de editar, valide todas as variáveis sem imprimir senhas, tokens ou
endereços:

```bash
npm run env:check
```

## Preparar o banco de dados

Com o MariaDB ativo, execute:

```bash
npm run db
```

O comando:

- cria o banco definido em `DB_DATABASE` caso ele não exista;
- cria as tabelas `audit` e `submissions`;
- preserva tabelas e registros existentes;
- pode ser executado novamente sem duplicar estruturas;
- verifica se o banco ficou pronto.

Comandos auxiliares:

```bash
npm run db:check
npm run db:setup
npm run db:init
```

## Iniciar o servidor e as páginas

Durante o desenvolvimento:

```bash
npm run dev
```

Endereços principais:

| Página | Endereço |
| --- | --- |
| Status da aplicação | `http://localhost:3000/` |
| Saúde do servidor e banco | `http://localhost:3000/health` |
| Login do participante P001 | `http://localhost:3000/login?p=P001` |
| Dashboard da apresentação | `http://localhost:3000/dashboard?p=P001` |

Para executar a versão compilada:

```bash
npm run build
npm start
```

## Dados fictícios para o login

Os valores permitidos ficam no `.env`:

```dotenv
ALLOWED_PARTICIPANT_CODES=P001,P002,P003
ALLOWED_TEST_CPFS=00000000000,11111111111,22222222222
```

Exemplo seguro para a demonstração:

```text
Participante: P001
CPF fictício: 000.000.000-00
Senha fictícia: teste123
```

O backend salva apenas:

```text
CPF: ***.***.***-00
Senha: [8 caracteres capturados]
```

Nenhum caractere da senha ou CPF completo deve ser persistido.

## Configurar o envio de e-mail

O envio externo permanece desabilitado no `.env.example`. Para utilizar uma
conta Gmail dedicada ao teste, configure somente no `.env`:

```dotenv
EMAIL_MODE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=seu-remetente@gmail.com
SMTP_PASSWORD=sua-senha-de-aplicativo
EMAIL_FROM=seu-remetente@gmail.com
SIMULATION_BASE_URL=http://localhost:3000

EMAIL_RECIPIENT_ALLOWLIST=destinatario-predefinido@gmail.com
ADMIN_API_TOKEN=crie-um-token-local-com-24-caracteres

ALLOW_RUNTIME_RECIPIENT_AUTHORIZATION=true
RUNTIME_RECIPIENT_AUTHORIZATION_TTL_SECONDS=300
```

`SMTP_PASSWORD` deve ser uma senha de aplicativo, não a senha normal da conta.
Não publique ou compartilhe o `.env`.

Valide a configuração sem exibir os segredos:

```bash
npm run email:check
```

O servidor precisa estar ativo em outro terminal:

```bash
npm run dev
```

## Enviar para o destinatário predefinido

Quando existir somente um endereço em `EMAIL_RECIPIENT_ALLOWLIST`, execute:

```bash
npm run email:send -- P001
```

O script utiliza automaticamente o destinatário predefinido, o token
administrativo e a configuração SMTP do `.env`.

Cada código de participante pode possuir somente um envio confirmado. Se o
`P001` já tiver recebido, utilize outro código autorizado ou execute a limpeza
da demonstração descrita abaixo.

## Digitar o e-mail de um voluntário

Para autorizar um endereço somente no momento do teste, abra o assistente:

```bash
npm run email:send
```

Exemplo:

```text
=== Envio de e-mail da Simulação Acadêmica ===

Participantes autorizados: P001, P002, P003
Código do participante [P001]: P002
Enviar e-mail para: voluntario@example.com
O voluntário autorizou o teste? Digite AUTORIZADO: AUTORIZADO

Confira antes do envio:
- participante: P002
- destinatário: vo***@example.com
- autorização: temporária, uso único
- modo: smtp
- link base: http://localhost:3000

Confirmar envio? [s/N]: s
```

A autorização temporária:

- exige a declaração `AUTORIZADO` e uma confirmação final;
- aceita somente códigos presentes em `ALLOWED_PARTICIPANT_CODES`;
- fica apenas na memória do servidor;
- expira após o período configurado, por padrão 5 minutos;
- é vinculada ao participante e usada uma única vez;
- não salva o endereço no banco ou em arquivo.

Pressionar Enter ou responder `n` na confirmação final cancela o envio.

## Limpar os dados para repetir os testes

Para remover os resultados da demonstração e reutilizar os códigos dos
participantes:

```bash
npm run db:reset
```

O terminal mostra a quantidade atual de eventos e submissões e exige a frase:

```text
RESETAR DEMONSTRACAO
```

Esse comando apaga somente os registros das tabelas `audit` e `submissions`.
O banco, as tabelas, o `.env` e as configurações permanecem intactos. Responder
qualquer outro texto cancela a operação sem remover dados.

A aplicação também oferece `POST /admin/reset-demo`, protegido pelo mesmo
Bearer Token administrativo e pela confirmação explícita.

## Dashboard

O dashboard consulta métricas agregadas e atualiza automaticamente:

- e-mails enviados;
- participantes que acessaram o link;
- formulários simulados enviados;
- taxa de clique;
- taxa de submissão;
- conversão após o clique.

Acesse:

```text
http://localhost:3000/dashboard?p=P001
```

## Verificações antes da apresentação

Execute:

```bash
npm run env:check
npm run db
npm run email:check
npm run db:reset
npm run lint
npm test
npm run build
```

## Compartilhar com os colegas

Envie o repositório sem o arquivo `.env`. Cada integrante deve criar a própria
configuração local:

```bash
cp .env.example .env
npm run env:check
```

Nunca compartilhe ou versione:

- `DB_PASSWORD` real;
- `SMTP_PASSWORD` ou senha de aplicativo;
- `ADMIN_API_TOKEN` usado na apresentação;
- endereços reais de voluntários.

O `.gitignore` bloqueia `.env` e variantes como `.env.local`, mantendo apenas
`.env.example` disponível no repositório.

## Problemas comuns

### O e-mail foi enviado, mas não aparece na caixa de entrada

Confira Spam, Lixeira e Todos os e-mails. O conteúdo da demonstração pode ser
classificado pelo provedor como suspeito. Não tente contornar os filtros de
segurança.

### O comando retorna `already_sent`

O participante já possui um evento `email_sent`. Escolha outro código
autorizado ou execute `npm run db:reset` antes de reiniciar toda a demonstração.

### Não foi possível conectar ao MariaDB

Confirme se o serviço está ativo e revise `DB_HOST`, `DB_PORT`, `DB_DATABASE`,
`DB_USERNAME` e `DB_PASSWORD` no `.env`.

### O link não abre em outro computador ou celular

`localhost` sempre aponta para o próprio dispositivo. Para uma demonstração em
outro aparelho, utilize somente um endereço da rede local autorizada em
`SIMULATION_BASE_URL`. Não exponha a aplicação publicamente.

## Documentação completa

O planejamento técnico, modelo de dados e roteiro operacional estão em
[`docs/EXECUCAO.md`](docs/EXECUCAO.md).
