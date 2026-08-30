import { describe, expect, it } from 'vitest';

import { InMemoryEmailRecipientAuthorizationStore } from '../src/modules/email/email.authorization';

describe('InMemoryEmailRecipientAuthorizationStore', () => {
  it('permite um unico claim e remove a autorizacao consumida', () => {
    const store = new InMemoryEmailRecipientAuthorizationStore(() => 1_000);

    store.authorize('P001', 'voluntario@example.test', 300_000);

    expect(store.claim('P001', 'voluntario@example.test')).toBe(true);
    expect(store.claim('P001', 'voluntario@example.test')).toBe(false);

    store.consume('P001', 'voluntario@example.test');
    expect(store.claim('P001', 'voluntario@example.test')).toBe(false);
  });

  it('recusa autorizacao expirada', () => {
    let now = 1_000;
    const store = new InMemoryEmailRecipientAuthorizationStore(() => now);

    store.authorize('P001', 'voluntario@example.test', 60_000);
    now = 61_001;

    expect(store.claim('P001', 'voluntario@example.test')).toBe(false);
  });
});
