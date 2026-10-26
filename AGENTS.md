# AGENTS.md — Fase 2 da Simulação Acadêmica de Phishing

## 1. Escopo

Estas instruções valem para todo o repositório.

O projeto é uma simulação acadêmica autorizada para a disciplina de Segurança e
Auditoria de Sistemas. A Fase 2 deve produzir uma experiência mais realista e
completa com um grupo pequeno de participantes voluntários. A aplicação e o
banco de dados serão executados localmente no computador de um integrante. Se
for necessário acesso por outros dispositivos, um túnel privado poderá apenas
encaminhar o tráfego até essa aplicação local; ele não transforma o laboratório
em serviço público. A atividade não captura credenciais verdadeiras nem cria
cobrança válida.

O fluxo principal é:

1. envio de e-mail acadêmico para uma allowlist fechada;
2. acesso ao laboratório por URL HTTPS do túnel autorizado;
3. página interativa que solicita CPF e senha fictícios de teste;
4. consulta local da identidade fictícia para obter nome e data de nascimento
   igualmente fictícios;
5. registro seguro e idempotente da interação;
6. apresentação de boleto ou aviso financeiro fictício e não pagável;
7. esclarecimento imediato da simulação;
8. dashboard administrativo com métricas agregadas.

O objetivo é demonstrar, de forma mensurável, como um fluxo de engenharia
social pode induzir uma pessoa a preencher um formulário e, em seguida,
realizar o esclarecimento educativo. A evidência deve ser formada por eventos,
valores fictícios e registros mascarados. O sistema não deve ser adaptado para
obter dados reais, enganar terceiros ou permitir pagamentos.

## 2. Decisões obrigatórias da Fase 2

### 2.1 CPF, nome e senha de teste

- A tela pode solicitar somente um CPF fornecido pelo laboratório.
- Todo CPF aceito deve ser sintético e constar previamente na configuração do
  exercício.
- O nome exibido deve vir de um cadastro local que relacione CPF fictício a nome
  fictício.
- A tela de login pode solicitar uma senha para reproduzir o fluxo visual, mas o
  participante deve usar exclusivamente a senha fictícia fornecida pelo
  laboratório.
- Quando o cenário usar data de nascimento como senha, a data também deve ser
  inventada e pertencer à identidade fictícia entregue ao participante.
- É proibido consultar CPF em API externa, base pública, data broker, sistema da
  faculdade ou serviço de terceiros para descobrir identidade real.
- CPF e senha integrais somente podem ser persistidos quando corresponderem
  exatamente a uma identidade sintética previamente emitida pelo laboratório.
  Qualquer valor fora desse cadastro deve ser descartado antes do `INSERT`; o
  sistema pode registrar apenas `unrecognized_input` sem conservar o conteúdo.
- Para métricas e dashboard geral, salvar a máscara `000.***.***-**`, uma faixa
  de comprimento como `[comprimento entre 8 e 12]` e o resultado booleano
  `credentials_match`.
- Para a demonstração didática de captura, o par sintético integral pode ser
  salvo em colunas separadas usando criptografia autenticada AES-256-GCM antes
  do `INSERT`. Armazenar `ciphertext`, `iv` e `auth_tag`; nunca texto puro.
- A chave de criptografia deve existir somente em variável de ambiente local,
  separada do banco, com valor de exemplo inválido no `.env.example`. Ela não
  pode aparecer em logs, commits, URLs, respostas de erro ou backups do banco.
- Hash não substitui a criptografia nesse cenário: hash é unidirecional e não
  pode ser descriptografado para a demonstração. Se houver necessidade de
  revelar o valor sintético, usar exclusivamente a rotina administrativa de
  descriptografia descrita abaixo.
- Não registrar CPF integral, nome, corpo da requisição ou dados pessoais nos
  logs.
- Não salvar texto puro, hash reutilizável ou cifra de entrada que não tenha
  sido reconhecida como credencial sintética do laboratório. Não solicitar OTP,
  cartão, conta bancária ou credencial real.

### 2.2 Demonstração controlada dos dados capturados

- A descriptografia é permitida somente em rota administrativa autenticada,
  durante o esclarecimento ou geração da evidência acadêmica.
- A interface deve exibir aviso permanente de que os valores revelados são
  fictícios e foram fornecidos pelo próprio laboratório.
- Cada revelação deve gerar evento de auditoria sem registrar o conteúdo
  revelado, o corpo da requisição ou a chave.
- A resposta descriptografada deve usar `Cache-Control: no-store` e nunca ser
  incluída no dashboard agregado, exportações, telemetria ou logs.
- A função deve possuir desligamento por variável de ambiente e permanecer
  desabilitada fora da janela formal da demonstração.
- Ao final do prazo de retenção, apagar ciphertexts, IVs e tags juntamente com
  os demais dados da campanha.

O repositório pode conter um arquivo de exemplo somente com identidades
claramente fictícias. Cadastros usados em uma apresentação devem permanecer em
arquivo local ignorado pelo Git ou em variáveis de ambiente.

### 2.3 Túnel privado

O túnel amplia o alcance do laboratório, mas não transforma a aplicação em um
site público. Seu uso é permitido apenas quando todas as condições abaixo forem
atendidas:

- hostname HTTPS pertencente à equipe ou à instituição e registrado no escopo;
- Cloudflare Access, política equivalente ou autenticação anterior à aplicação;
- acesso limitado aos participantes e responsáveis autorizados;
- janela de funcionamento com início e término definidos;
- aplicação local vinculada a `127.0.0.1`, sem porta diretamente exposta;
- encerramento do túnel imediatamente após a atividade;
- dashboard e rotas administrativas protegidos separadamente;
- nenhum bypass de filtros, SPF, DKIM, DMARC ou controles da instituição.

O repositório deve documentar a configuração esperada, mas não deve versionar
token do túnel, credencial Cloudflare, certificado, hostname privado ou política
com identidades reais.

### 2.4 E-mail

- `EMAIL_MODE=disabled` permanece como padrão.
- Mailpit deve continuar disponível para desenvolvimento e ensaio.
- Envio externo exige modo acadêmico explicitamente habilitado.
- O remetente deve usar conta e domínio que a equipe ou instituição possa usar
  legitimamente.
- Destinatários devem estar em allowlist fechada e cobertos pela autorização.
- O link do e-mail deve apontar somente para a URL HTTPS autorizada do túnel.
- Aplicar limite total por campanha e limite de taxa.
- Registrar `email_sent` somente quando o transporte aceitar a mensagem.
- Não usar remetente falsificado, lista aberta, disparo em massa, encurtador
  público ou técnica para evadir filtros.

Testes de divergência entre `From`, `Reply-To` e `Return-Path` são permitidos
somente no Mailpit, com domínios reservados como `.test`.

### 2.5 Boleto fictício

O boleto pode ter acabamento profissional e informações plausíveis, desde que
todo o conteúdo seja fictício e não utilizável financeiramente.

Requisitos:

- beneficiário, documento, endereço, valor e vencimento fictícios;
- nome fictício obtido do cadastro local de teste;
- marca e identidade visual originais do laboratório;
- texto inequívoco de documento demonstrativo no debriefing e no próprio
  documento;
- linha digitável deliberadamente inválida;
- código de barras apenas decorativo e não compatível com padrão bancário;
- nenhum QR Code Pix, chave Pix, botão de pagamento ou link bancário;
- nenhuma ação de impressão ou cópia deve transformar o documento em cobrança
  válida.

## 3. Consentimento e autorização

### 3.1 Participantes e recorte da demonstração

- Utilizar uma amostra de conveniência com, no mínimo, cinco participantes.
- Convidar somente acadêmicos voluntários conhecidos pelo grupo e pertencentes
  a outros semestres do curso.
- Excluir estudantes do 4º período, conforme o recorte definido para o teste.
- Não apresentar a amostra como representativa de toda a comunidade acadêmica.
- Cada participante deve receber um código opaco e uma identidade inteiramente
  fictícia, contendo nome, CPF e, quando necessário, data de nascimento e senha
  de teste preparados pelo laboratório.
- As instruções do exercício devem afirmar que o participante não pode usar seu
  CPF, data de nascimento, senha ou qualquer outro dado verdadeiro.
- O endereço usado para o convite pode permanecer apenas na configuração local
  da allowlist e não deve ser persistido nas tabelas da demonstração.
- A recusa ou desistência não pode produzir qualquer consequência acadêmica ao
  participante.
- O esclarecimento deve ocorrer imediatamente após a interação, explicando que
  uma página maliciosa real poderia transmitir os valores completos.
- Depois da apresentação e da extração das métricas agregadas, executar a
  limpeza dos registros conforme o prazo aprovado.

### 3.2 Ambiente local e custódia

- Servidor, aplicação e MariaDB serão executados no computador de um integrante
  designado como responsável pela custódia técnica.
- O banco local deve aceitar conexões somente da própria máquina, salvo
  configuração de laboratório formalmente autorizada.
- O acesso de participantes ocorre pela rede acadêmica autorizada ou por túnel
  privado protegido, sem exposição direta da porta do banco ou do servidor.
- Somente integrantes responsáveis podem acessar banco, arquivos de ambiente,
  dashboard e rotinas administrativas.
- Capturas de tela, vídeo e relatório devem mostrar apenas métricas agregadas,
  códigos opacos e valores mascarados.
- O fato de o banco ser local não autoriza a persistência de CPF, senha, nome ou
  qualquer outro dado pessoal verdadeiro.

### 3.3 Registro da autorização

Antes de uma campanha pelo túnel, preencher `docs/ESCOPO_AUTORIZADO.md` com:

- disciplina, responsável e referência da autorização;
- período e janela de execução;
- hostname e infraestrutura autorizados;
- forma de consentimento prévio dos participantes;
- destinatários elegíveis e procedimento de desistência;
- remetente e domínio permitidos;
- quantidade máxima de envios;
- métricas coletadas e prazo de retenção;
- responsável pela parada e pela exclusão dos dados.

Uma alegação genérica de autorização não habilita ativos, períodos ou pessoas
fora desse documento.

Participantes devem consentir previamente com o formato do exercício e com o
uso de métricas. O momento exato da simulação pode ser reservado se isso estiver
previsto no consentimento. O esclarecimento deve aparecer imediatamente após a
interação, antes de qualquer encaminhamento externo.

O consentimento do participante e a autorização institucional são requisitos
distintos. A autorização da disciplina não substitui a participação voluntária
nem amplia a coleta além dos dados fictícios definidos neste documento.

## 4. Modos de execução

### `LAB_LOCAL`

- modo padrão;
- host local ou rede de laboratório;
- Mailpit;
- banner `Simulação Acadêmica` visível no e-mail e nas páginas;
- identidades e destinatários sintéticos.

### `ACADEMICO_AUTORIZADO`

- habilitação explícita;
- escopo documentado;
- túnel HTTPS privado e protegido;
- destinatários autorizados em allowlist;
- remetente legítimo;
- tokens de participante imprevisíveis e expirados;
- debriefing imediato;
- parada e exclusão de dados disponíveis ao administrador.

Neste projeto, esse modo mantém aplicação e banco no computador custodiante.
Quando utilizado, o túnel fornece somente conectividade autenticada e temporária
para os participantes definidos na Seção 3.1.

Se qualquer requisito desse modo estiver ausente, a aplicação deve recusar o
início ou o envio da campanha.

## 5. Identidade visual e cenários

- Usar identidade visual original e fictícia do laboratório em todas as telas e
  mensagens.
- Não copiar uma faculdade, banco, empresa ou serviço real.
- Remover do fluxo operacional logotipos, nomes e fundos de terceiros, salvo se
  existir autorização específica do titular registrada no escopo.
- Cenários permitidos: aviso financeiro, prazo acadêmico, atualização cadastral
  e documento pendente, todos fictícios.
- O realismo deve vir de layout, texto, responsividade e fluxo coerente, não da
  apropriação da identidade de terceiros.

## 6. Tokens, eventos e dados

- Cada campanha deve possuir identificador próprio.
- Cada participante deve receber token aleatório, opaco, expirável e vinculado
  a uma única campanha.
- Armazenar somente o hash do token.
- Não colocar CPF, nome, e-mail ou matrícula na URL.
- O logger não deve registrar query strings contendo tokens.
- O mesmo participante conta no máximo uma vez por evento e campanha.

Eventos da Fase 2:

- `email_sent`;
- `link_clicked`;
- `cpf_submitted` ou `form_interacted`;
- `awareness_viewed`.

Não registrar IP, geolocalização, fingerprint, cookies de terceiros ou conteúdo
digitado fora do conjunto sintético previamente cadastrado. O banco pode receber
o CPF mascarado, a faixa de tamanho, o resultado booleano da validação, os
eventos autorizados e, somente para a demonstração controlada, o par sintético
integral cifrado conforme a seção 2.2.

Durante o esclarecimento, a equipe pode apresentar uma visão didática do que um
atacante tentaria obter. Essa visão deve usar um exemplo estático inteiramente
sintético ou os registros já mascarados; ela não pode revelar nem reconstruir o
conteúdo integral submetido pelo participante.

## 7. Dashboard, campanha e administração

Rotas administrativas exigem autenticação e autorização. O sistema deve
oferecer:

- criação de campanha;
- ativação dentro da janela autorizada;
- limite de envios;
- parada imediata;
- métricas por campanha;
- exportação agregada sem dados pessoais;
- limpeza por campanha e por prazo de retenção.

Métricas mínimas:

- participantes elegíveis;
- envios aceitos;
- participantes únicos que clicaram;
- participantes únicos que informaram o CPF fictício;
- participantes que visualizaram o esclarecimento;
- taxa de clique;
- taxa de interação;
- conversão após clique;
- taxa de conclusão da conscientização.

O relatório da demonstração deve informar o tamanho real da amostra, o critério
de seleção por conveniência e a exclusão do 4º período. Resultados individuais
não devem ser usados para classificar, constranger ou comparar participantes.

Tratar divisão por zero, repetição de página, campanha vazia e banco
indisponível.

## 8. Análise defensiva

A ferramenta defensiva pode analisar artefatos sintéticos:

- URL, domínio, IP literal, porta, caminho e parâmetros;
- Unicode, IDN, Punycode e homoglyphs;
- encurtadores conhecidos e redirecionamento privado do laboratório;
- QR Code que aponte somente para URL própria e autorizada;
- linguagem de urgência, autoridade, recompensa e ameaça;
- discrepâncias de cabeçalhos SMTP no Mailpit.

Não abrir automaticamente URLs suspeitas. Qualquer expansão deve limitar tempo,
tamanho e saltos e bloquear SSRF, endereços locais indevidos e redirecionamento
aberto.

Os testes devem possuir verdade-terreno e relatar falsos positivos, falsos
negativos, precisão, revocação e limitações, sem exagerar a eficácia medida.

## 9. Stack e arquitetura

- Backend: Node.js, TypeScript estrito e Fastify.
- Frontend: HTML, CSS e JavaScript sem framework.
- Banco: MariaDB/MySQL.
- ORM: Sequelize com driver `mariadb`.
- E-mail: Nodemailer por abstração de transporte.
- Validação: Zod ou equivalente no servidor.
- Desenvolvimento: `tsx`, Vitest, lint e build automatizados.

Estrutura esperada:

```text
src/
  config/
  database/
    migrations/
    models/
  modules/
    admin/
    analyzer/
    campaigns/
    dashboard/
    email/
    health/
    login/
    reports/
  utils/
  app.ts
  server.ts
public/
  assets/
  login.html
  boleto.html
  awareness.html
  dashboard.html
database/
  schema.sql
docs/
  ESCOPO_AUTORIZADO.md
  EXECUCAO.md
  METODOLOGIA.md
```

Manter módulos pequenos e não colocar regra de negócio nos arquivos HTML.
Ampliações do banco devem usar migração documentada e preservar dados existentes
até a aplicação explícita da política de retenção.

## 10. Rotas de referência

- `GET /health`;
- `POST /admin/campaigns`;
- `POST /admin/campaigns/:id/start`;
- `POST /admin/campaigns/:id/stop`;
- `POST /admin/send`;
- `GET /login?p=<token>`;
- `POST /login/cpf`;
- `GET /boleto?p=<token>`;
- `GET /awareness?p=<token>`;
- `GET /admin/dashboard`;
- `GET /admin/reports/:campaignId`;
- `POST /admin/reset-demo`;
- `POST /analyzer/check`.

Evitar quebrar rotas da Fase 1 sem migração. Endpoints administrativos nunca
devem ficar públicos.

## 11. Controles mínimos

- validação no servidor;
- parâmetros vinculados em SQL;
- redigir corpo, autorização, cookies, tokens e segredos nos logs;
- erro interno sem SQL ou stack trace para o navegador;
- limite global e específico de corpo;
- rate limit em login, análise e administração;
- proteção CSRF quando forem usadas sessões por cookie;
- cookies `HttpOnly`, `SameSite=Strict` e `Secure` no modo autorizado;
- `Cache-Control: no-store` e `Referrer-Policy: no-referrer` nas páginas da
  campanha;
- segredos exclusivamente em variáveis de ambiente ou cofre local;
- `.env`, destinatários, tokens e políticas privadas ignorados pelo Git;
- envio externo e túnel desabilitados por padrão;
- botão de parada e limpeza documentados.

## 12. Testes de aceitação

Antes de concluir a Fase 2, verificar:

1. `LAB_LOCAL` não envia e-mail para a internet.
2. O túnel não oferece acesso sem a política autorizada.
3. Campanha fora da janela ou parada não envia mensagens.
4. Destinatário e remetente fora do escopo são recusados.
5. CPF fora do cadastro fictício é recusado sem aparecer em logs.
6. Entrada não reconhecida é descartada antes do banco sem registrar conteúdo.
7. CPF e senha integrais aceitos são exclusivamente sintéticos e chegam ao
   banco apenas como AES-256-GCM; texto puro não aparece em banco ou logs.
8. A revelação administrativa exige autenticação, gera auditoria, usa
   `Cache-Control: no-store` e fica desabilitada fora da janela da demonstração.
9. Tokens são aleatórios, expirados e armazenados por hash.
10. Atualizações não inflam métricas.
11. Boleto não possui linha, código, QR ou ação de pagamento válidos.
12. O nome do boleto vem apenas do cadastro fictício local.
13. O esclarecimento é exibido e registrado.
14. Dashboard e relatórios recusam acesso não autenticado.
15. Rate limit, parada e limpeza funcionam.
16. Analisador não navega automaticamente para destino suspeito.
17. Testes defensivos incluem casos positivos, negativos e limitações.
18. `npm run lint`, `npm test` e `npm run build` passam.
19. `docs/EXECUCAO.md`, `docs/ESCOPO_AUTORIZADO.md` e
    `docs/METODOLOGIA.md` estão atualizados.

## 13. Ordem de implementação

1. substituir identidade real por identidade fictícia original;
2. limitar o campo de senha ao valor fictício do laboratório e garantir que
   somente uma descrição do tamanho seja persistida;
3. implementar cadastro local de CPF e nome fictícios;
4. introduzir campanhas e tokens expirados;
5. proteger dashboard e rotas administrativas;
6. adaptar e-mail para URL autorizada do túnel;
7. reforçar boleto e conscientização;
8. adicionar limites, parada, desistência e retenção;
9. implementar analisador, QR Code e testes SMTP no Mailpit;
10. gerar métricas, relatórios e evidências da PoC.

## 14. Como agentes devem trabalhar

- Implementar funcionalidades compatíveis de fato, incluindo código, testes e
  documentação.
- Quando uma solicitação apresentar risco, implementar a alternativa segura
  mais próxima sem abandonar o restante da tarefa.
- Não interpretar autorização acadêmica como permissão para buscar CPF real,
  coletar credenciais, copiar marca de terceiro, enviar a lista aberta ou deixar
  a aplicação pública.
- Preservar alterações locais não relacionadas e não sobrescrever segredos.
- Atualizar a documentação operacional a cada incremento.

## 15. Critério de pronto

Uma funcionalidade está pronta quando funciona de ponta a ponta no laboratório
autorizado, passa nos testes proporcionais ao risco, apresenta erro
compreensível, não expõe dado pessoal ou segredo, possui procedimento de parada
e está documentada para execução e auditoria.
