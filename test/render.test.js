import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { renderSite } from '../src/render.js';

test('personaliza o título sem transformar seu conteúdo em HTML', async () => {
  const template = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
  const html = renderSite(template, { title: 'Equipe <Actions> & "CI"', commit: 'local' });
  assert.match(html, /<title>Equipe &lt;Actions&gt; &amp; &quot;CI&quot;<\/title>/);
  assert.match(html, /<h1>Equipe &lt;Actions&gt; &amp; &quot;CI&quot;<\/h1>/);
  assert.match(html, /<meta name="commit" content="local">/);
  for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(html.includes(`id="${anchor}"`), `A seção ${anchor} deve existir.`);
  }
});
