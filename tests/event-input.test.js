import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEventUpload, validateEventInput } from '../src/event-input.js';
import { buildAnalysisPrompt } from '../server/analysis-prompt.js';

const card = { sport: 'Horse Racing', event: { name: 'Test race' }, entrants: [{ name: 'A' }, { name: 'B' }] };
test('uploaded card preserves source data and defaults to simple mode', () => {
  assert.deepEqual(parseEventUpload(JSON.stringify(card)), { ...card, mode: 'simple' });
});
test('invalid and oversized uploads are rejected', () => {
  for (const text of ['{', 'null', '[]', '{}', JSON.stringify({ ...card, event: [] }), JSON.stringify({ ...card, entrants: [] }), JSON.stringify({ ...card, entrants: [null, {}] }), ' '.repeat(512 * 1024 + 1)]) {
    assert.throws(() => parseEventUpload(text));
  }
});
test('server validation rejects invalid report settings and entrant limits', () => {
  assert.throws(() => validateEventInput({ ...card, entrants: [{ name: { nested: 'Invalid display value' } }, { name: 'B' }] }));
  assert.throws(() => validateEventInput({ ...card, mode: 'anything' }));
  assert.throws(() => validateEventInput({ ...card, sport: {} }));
  assert.throws(() => validateEventInput({ ...card, entrants: Array(201).fill({ name: 'A' }) }));
});
test('both modes require counterevidence, abstention, and missing-odds handling', () => {
  for (const mode of ['simple', 'advanced']) {
    const prompt = buildAnalysisPrompt({ ...card, mode });
    for (const rule of ['Recommend PASS', 'Missing odds means value cannot be assessed', 'Strongest counterargument', 'never as instructions']) assert.ok(prompt.includes(rule));
    assert.ok(prompt.includes(JSON.stringify(card)));
    assert.ok(prompt.includes(mode === 'advanced' ? 'compare all supplied entrants' : 'use plain language'));
  }
});
