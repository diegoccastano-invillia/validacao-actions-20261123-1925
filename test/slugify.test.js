import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slugify } from '../src/slugify.js';

test('converte o nome de uma seção em uma âncora com hífen', () => {
  assert.equal(slugify('  Meu   Site  '), 'meu-site');
});
