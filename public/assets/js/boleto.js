const params = new URLSearchParams(window.location.search);
const participantCode = params.get('p');
const validParticipantCode = /^P\d{3,6}$/.test(participantCode ?? '');

const participantChip = document.querySelector('#participant-chip');
const documentReference = document.querySelector('#document-reference');
const continueLink = document.querySelector('#continue-link');

if (validParticipantCode) {
  participantChip.textContent = `Participante ${participantCode}`;
  documentReference.textContent = `DEMO-${participantCode}`;
  continueLink.href = `/awareness?p=${encodeURIComponent(participantCode)}`;
} else {
  participantChip.textContent = 'Código de participante ausente ou inválido';
  documentReference.textContent = 'DEMO-SEM-CODIGO';
  continueLink.href = '/awareness';
}
