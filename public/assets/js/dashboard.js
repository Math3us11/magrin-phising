const elements = {
  emailsSent: document.querySelector('#emails-sent'),
  linksClicked: document.querySelector('#links-clicked'),
  formsSubmitted: document.querySelector('#forms-submitted'),
  clickRate: document.querySelector('#click-rate'),
  submissionRate: document.querySelector('#submission-rate'),
  conversionRate: document.querySelector('#conversion-rate'),
  sentFunnelValue: document.querySelector('#sent-funnel-value'),
  clickedFunnelValue: document.querySelector('#clicked-funnel-value'),
  submittedFunnelValue: document.querySelector('#submitted-funnel-value'),
  sentBar: document.querySelector('#sent-bar'),
  clickedBar: document.querySelector('#clicked-bar'),
  submittedBar: document.querySelector('#submitted-bar'),
  updatedAt: document.querySelector('#updated-at'),
  feedback: document.querySelector('#dashboard-feedback'),
  refreshButton: document.querySelector('#refresh-button'),
  participantChip: document.querySelector('#participant-chip'),
  backToLogin: document.querySelector('#back-to-login'),
};

const participantCode = new URLSearchParams(window.location.search).get('p');

if (/^P\d{3,6}$/.test(participantCode ?? '')) {
  elements.participantChip.textContent = `Participante ${participantCode}`;
  elements.backToLogin.href = `/login?p=${encodeURIComponent(participantCode)}`;
}

function formatRate(value) {
  return `${Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

function renderMetrics(metrics) {
  elements.emailsSent.textContent = metrics.emailsSent;
  elements.linksClicked.textContent = metrics.linksClicked;
  elements.formsSubmitted.textContent = metrics.formsSubmitted;
  elements.clickRate.textContent = formatRate(metrics.clickRate);
  elements.submissionRate.textContent = formatRate(metrics.submissionRate);
  elements.conversionRate.textContent = formatRate(metrics.conversionAfterClick);

  elements.sentFunnelValue.textContent = metrics.emailsSent;
  elements.clickedFunnelValue.textContent = metrics.linksClicked;
  elements.submittedFunnelValue.textContent = metrics.formsSubmitted;

  const largestTotal = Math.max(
    1,
    metrics.emailsSent,
    metrics.linksClicked,
    metrics.formsSubmitted,
  );

  elements.sentBar.style.width = `${(metrics.emailsSent / largestTotal) * 100}%`;
  elements.clickedBar.style.width = `${(metrics.linksClicked / largestTotal) * 100}%`;
  elements.submittedBar.style.width = `${(metrics.formsSubmitted / largestTotal) * 100}%`;
  elements.updatedAt.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;
}

async function loadMetrics() {
  elements.refreshButton.disabled = true;

  try {
    const response = await fetch('/api/dashboard/metrics', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Metrics unavailable');
    }

    renderMetrics(await response.json());
    elements.feedback.hidden = true;
  } catch {
    elements.feedback.textContent =
      'Não foi possível atualizar os resultados. Verifique a conexão com o servidor.';
    elements.feedback.hidden = false;
  } finally {
    elements.refreshButton.disabled = false;
  }
}

elements.refreshButton.addEventListener('click', loadMetrics);
void loadMetrics();
window.setInterval(loadMetrics, 5000);

