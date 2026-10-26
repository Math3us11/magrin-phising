const participantCode = new URLSearchParams(window.location.search).get('p');
const validParticipantCode = /^P\d{3,6}$/.test(participantCode ?? '');

const participantChip = document.querySelector('#participant-chip');
const restartLink = document.querySelector('#restart-link');

if (validParticipantCode) {
  participantChip.textContent = `Participante ${participantCode}`;
  restartLink.href = `/login?p=${encodeURIComponent(participantCode)}`;
} else {
  participantChip.textContent = 'Atividade educativa';
  restartLink.href = '/login';
}
