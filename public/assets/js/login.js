const form = document.querySelector('#login-form');
const cpfInput = document.querySelector('#cpf');
const passwordInput = document.querySelector('#password');
const participantInput = document.querySelector('#participant-code');
const participantNotice = document.querySelector('#participant-notice');
const submitButton = document.querySelector('#submit-button');
const forgotPasswordButton = document.querySelector('#forgot-password');
const feedback = document.querySelector('#form-feedback');

const participantCode = new URLSearchParams(window.location.search).get('p');
const validParticipantCode = /^P\d{3,6}$/.test(participantCode ?? '');

if (validParticipantCode) {
  participantInput.value = participantCode;
  participantNotice.textContent = `Participante de teste: ${participantCode}`;
  participantNotice.hidden = true;
} else {
  participantNotice.textContent =
    'Abra o link individual da demonstração, por exemplo: /login?p=P001.';
  participantNotice.hidden = false;
  submitButton.disabled = true;
}

cpfInput.addEventListener('input', () => {
  const digits = cpfInput.value.replace(/\D/g, '').slice(0, 11);
  const parts = [];

  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 9));

  let formatted = parts.join('.');

  if (digits.length > 9) {
    formatted += `-${digits.slice(9, 11)}`;
  }

  cpfInput.value = formatted;
});

forgotPasswordButton.addEventListener('click', () => {
  feedback.textContent =
    'Recuperação de senha indisponível nesta simulação acadêmica.';
  feedback.hidden = false;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Entrando...';
  feedback.hidden = true;

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participantCode: participantInput.value,
        cpf: cpfInput.value,
        password: passwordInput.value,
      }),
    });

    const result = await response.json();

    feedback.textContent = response.ok
      ? 'Login fictício registrado com segurança para a demonstração.'
      : result.error ?? 'Não foi possível registrar os dados de teste.';
    feedback.hidden = false;

    if (response.ok && result.nextUrl) {
      window.setTimeout(() => {
        window.location.assign(result.nextUrl);
      }, 650);
    }
  } catch {
    feedback.textContent =
      'Servidor indisponível. Tente novamente quando a demonstração estiver ativa.';
    feedback.hidden = false;
  } finally {
    passwordInput.value = '';
    submitButton.disabled = false;
    submitButton.textContent = 'Login';
  }
});
