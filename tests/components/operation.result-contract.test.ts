import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeTxResult } from '../../src/components/operation/OperationForm';

test('normalizeTxResult: guards post-action result rendering for incomplete line payload', () => {
  const normalized = normalizeTxResult({
    transaction: { id: 'tx-1', batchId: 'BAT-1', type: 'IN', occurredAt: new Date().toISOString() },
    lines: [
      {
        id: 'line-1',
        qtyInput: '10',
        status: 'ACTIVE',
        comment: null,
      } as any,
    ],
  } as any);

  assert.equal(normalized.lines[0]?.item.name, 'Неизвестная позиция');
  assert.equal(normalized.lines[0]?.unit.name, '—');
  assert.equal(normalized.lines[0]?.expenseArticle.code, '—');
  assert.equal(normalized.lines[0]?.purpose.code, '—');
});
