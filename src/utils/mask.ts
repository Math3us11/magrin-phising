export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskCpf(value: string): string {
  const normalized = normalizeCpf(value);

  if (!/^\d{11}$/.test(normalized)) {
    throw new Error('CPF de teste invalido.');
  }

  return `***.***.***-${normalized.slice(-2)}`;
}

export function maskPassword(value: string): string {
  return `[${value.length} caracteres capturados]`;
}

