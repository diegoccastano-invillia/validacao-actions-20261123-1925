import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { renderSite } from '../src/render.js';

const title = process.env.SITE_TITLE?.trim() || 'Portal da equipe';
const commit = process.env.GITHUB_SHA || 'local';
if (commit !== 'local' && !/^[a-f0-9]{40}$/i.test(commit)) {
  throw new Error('GITHUB_SHA precisa ser o identificador completo de um commit.');
}

const template = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
const output = new URL('../dist/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.html', output), renderSite(template, { title, commit }));
await copyFile(new URL('../site/style.css', import.meta.url), new URL('style.css', output));
console.log(`Site gerado em dist/ com o título "${title}".`);
