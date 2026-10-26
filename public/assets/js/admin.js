const TOKEN_STORAGE_KEY = 'sentinela_admin_token';

const el = (id) => document.querySelector(`#${id}`);

const connectionChip = el('connection-chip');
const authForm = el('auth-form');
const authFeedback = el('auth-feedback');
const protectedArea = document.querySelector('[data-requires-auth]');
const campaignsList = el('campaigns-list');
const enrollResult = el('enroll-result');
const sendFeedback = el('send-feedback');
const metricsGrid = el('metrics-grid');

let adminToken = '';
let campaignsCache = [];

try {
  adminToken = sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
} catch {
  adminToken = '';
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (adminToken) {
    headers.Authorization = `Bearer ${adminToken}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(path, {
    method,
    headers,
    cache: 'no-store',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  return { ok: response.ok, status: response.status, data };
}

function showFeedback(node, message, variant) {
  node.textContent = message;
  node.className = `feedback feedback--${variant}`;
  node.hidden = false;
}

function setConnected(connected) {
  connectionChip.textContent = connected ? 'Conectado' : 'Desconectado';
  connectionChip.className = `chip ${connected ? 'chip--on' : 'chip--off'}`;
  protectedArea.hidden = !connected;
}

function toIsoOrNull(localValue) {
  if (!localValue) {
    return null;
  }
  const parsed = new Date(localValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function fillCampaignSelect(select, keepPlaceholder) {
  const previous = select.value;
  select.innerHTML = keepPlaceholder
    ? '<option value="">Todas as campanhas</option>'
    : '';

  for (const campaign of campaignsCache) {
    const option = document.createElement('option');
    option.value = String(campaign.id);
    option.textContent = `#${campaign.id} — ${campaign.name} (${campaign.status})`;
    select.append(option);
  }

  select.value = previous;
}

function renderCampaigns() {
  if (campaignsCache.length === 0) {
    campaignsList.innerHTML =
      '<p class="empty">Nenhuma campanha criada ainda.</p>';
    return;
  }

  campaignsList.innerHTML = '';
  for (const campaign of campaignsCache) {
    const row = document.createElement('div');
    row.className = 'campaign-row';

    const window =
      campaign.startsAt || campaign.endsAt
        ? `janela: ${campaign.startsAt ?? '—'} → ${campaign.endsAt ?? '—'}`
        : 'sem janela definida';
    const limit =
      campaign.maxSends === null ? 'sem limite' : `limite ${campaign.maxSends}`;

    row.innerHTML = `
      <span class="campaign-row__name">#${campaign.id} ${campaign.name}</span>
      <span class="status status--${campaign.status}">${campaign.status}</span>
      <span class="campaign-row__meta">${window} · ${limit}</span>
    `;

    const actions = document.createElement('div');
    actions.className = 'campaign-row__actions';

    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'btn btn--sm btn--ghost';
    startBtn.textContent = 'Iniciar';
    startBtn.disabled = campaign.status !== 'draft';
    startBtn.addEventListener('click', () => changeStatus(campaign.id, 'start'));

    const stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.className = 'btn btn--sm btn--stop';
    stopBtn.textContent = 'Parar';
    stopBtn.disabled = campaign.status === 'stopped';
    stopBtn.addEventListener('click', () => changeStatus(campaign.id, 'stop'));

    actions.append(startBtn, stopBtn);
    row.append(actions);
    campaignsList.append(row);
  }
}

async function loadCampaigns() {
  const result = await api('/admin/campaigns');

  if (!result.ok) {
    throw new Error(result.data.error ?? 'Falha ao carregar campanhas.');
  }

  campaignsCache = result.data.campaigns ?? [];
  renderCampaigns();
  fillCampaignSelect(el('enroll-campaign'), false);
  fillCampaignSelect(el('send-campaign'), false);
  fillCampaignSelect(el('metrics-campaign'), true);
  await loadMetrics();
}

async function changeStatus(id, action) {
  const result = await api(`/admin/campaigns/${id}/${action}`, {
    method: 'POST',
  });

  if (!result.ok) {
    showFeedback(
      authFeedback,
      result.data.error ?? 'Não foi possível alterar a campanha.',
      'error',
    );
    return;
  }

  await loadCampaigns();
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  adminToken = el('admin-token').value.trim();

  try {
    if (el('remember-token').checked) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, adminToken);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* armazenamento indisponível: segue apenas em memória */
  }

  try {
    await loadCampaigns();
    setConnected(true);
    showFeedback(authFeedback, 'Conectado ao ambiente local.', 'ok');
  } catch (error) {
    setConnected(false);
    showFeedback(
      authFeedback,
      error instanceof Error ? error.message : 'Token inválido.',
      'error',
    );
  }
});

el('refresh-campaigns').addEventListener('click', () => {
  loadCampaigns().catch((error) =>
    showFeedback(authFeedback, error.message, 'error'),
  );
});

el('campaign-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const maxRaw = el('campaign-max').value.trim();

  const result = await api('/admin/campaigns', {
    method: 'POST',
    body: {
      name: el('campaign-name').value.trim(),
      ...(maxRaw ? { maxSends: Number(maxRaw) } : {}),
      ...(toIsoOrNull(el('campaign-start').value)
        ? { startsAt: toIsoOrNull(el('campaign-start').value) }
        : {}),
      ...(toIsoOrNull(el('campaign-end').value)
        ? { endsAt: toIsoOrNull(el('campaign-end').value) }
        : {}),
    },
  });

  if (!result.ok) {
    showFeedback(
      authFeedback,
      result.data.error ?? 'Não foi possível criar a campanha.',
      'error',
    );
    return;
  }

  event.target.reset();
  await loadCampaigns();
});

el('enroll-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const codes = el('enroll-codes')
    .value.split(/[\s,;]+/)
    .map((code) => code.trim())
    .filter(Boolean);

  const result = await api(
    `/admin/campaigns/${el('enroll-campaign').value}/participants`,
    {
      method: 'POST',
      body: {
        codes,
        expiresInHours: Number(el('enroll-expiry').value) || 72,
      },
    },
  );

  if (!result.ok) {
    enrollResult.innerHTML = `<p class="feedback feedback--error">${
      result.data.error ?? 'Falha ao inscrever participantes.'
    }</p>`;
    return;
  }

  enrollResult.innerHTML = '';
  for (const participant of result.data.participants ?? []) {
    const item = document.createElement('div');
    item.className = 'link-item';
    item.innerHTML = `<strong>${participant.participantCode}</strong>`;
    const link = document.createElement('span');
    link.textContent = participant.loginUrl;
    item.append(link);
    enrollResult.append(item);
  }
  await loadCampaigns();
});

el('send-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const participantCode = el('send-code').value.trim();
  const recipient = el('send-recipient').value.trim();
  const campaignId = Number(el('send-campaign').value);

  if (el('send-consent').checked) {
    const authorized = await api('/admin/email/authorize', {
      method: 'POST',
      body: { participantCode, recipient, consent: 'AUTORIZADO' },
    });
    if (!authorized.ok) {
      showFeedback(
        sendFeedback,
        authorized.data.error ?? 'Autorização temporária recusada.',
        'error',
      );
      return;
    }
  }

  const result = await api('/admin/send', {
    method: 'POST',
    body: { campaignId, participantCode, recipient },
  });

  if (!result.ok) {
    showFeedback(
      sendFeedback,
      result.data.error ?? 'Não foi possível enviar.',
      'error',
    );
    return;
  }

  const messages = {
    sent: 'E-mail confirmado pelo transporte e evento email_sent registrado.',
    already_sent: 'Participante já possui envio; nenhum reenvio foi feito.',
    disabled: 'EMAIL_MODE=disabled: nenhuma mensagem saiu para a internet.',
  };
  showFeedback(
    sendFeedback,
    messages[result.data.status] ?? `Status: ${result.data.status}`,
    'ok',
  );
  await loadMetrics();
});

async function loadMetrics() {
  const campaignId = el('metrics-campaign').value;
  const query = campaignId ? `?campaignId=${campaignId}` : '';
  const result = await api(`/api/dashboard/metrics${query}`);

  if (!result.ok) {
    metricsGrid.innerHTML =
      '<p class="empty">Métricas indisponíveis no momento.</p>';
    return;
  }

  const metrics = result.data;
  const cells = [
    ['E-mails', metrics.emailsSent],
    ['Cliques', metrics.linksClicked],
    ['Logins', metrics.formsSubmitted],
    ['Taxa de clique', `${metrics.clickRate}%`],
    ['Taxa de login', `${metrics.submissionRate}%`],
    ['Conversão', `${metrics.conversionAfterClick}%`],
  ];

  metricsGrid.innerHTML = '';
  for (const [label, value] of cells) {
    const metric = document.createElement('div');
    metric.className = 'metric';
    metric.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    metricsGrid.append(metric);
  }
}

el('metrics-campaign').addEventListener('change', () => {
  loadMetrics().catch(() => undefined);
});

// Reconecta automaticamente se o token ficou guardado nesta aba.
if (adminToken) {
  el('admin-token').value = adminToken;
  el('remember-token').checked = true;
  loadCampaigns()
    .then(() => setConnected(true))
    .catch(() => setConnected(false));
}
